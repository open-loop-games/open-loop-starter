/**
 * Looper balance solver — math-first, Tier-B Phase-Shifter shape.
 *
 * Per-strategy outer loop × per-beat inner bisection. Each farm strategy
 * (`farm-mana-pool`, `farm-gold-buffer`, `farm-talent`) gets its own
 * `PlannerParams` set; for each enabled beat, the solver bisects a
 * relevant knob against `projectArc` (closed-form, fast) targeting the
 * beat window midpoint, then sim-verifies the converged proposals via
 * `runUntil` against `LooperTuningRegistryKey` + `plannerParamsOverride`.
 *
 * Discipline (per `archetypes/BALANCING.md` § scripts-discover-tests-lock):
 *
 *   - Math first, sim verifies. The inner-loop oracle is the projector
 *     (`balance/projector.ts`); sim runs only at the end of each strategy
 *     pass to confirm the proposal lands in-window under engine truth.
 *   - Step solver up incrementally per per-project memory. The
 *     `ENABLED_*` gates ship the smallest viable rung; expand by
 *     uncommenting beats / strategies / lifting `PASSES` as each rung
 *     converges.
 *   - No data-file mutation. Output is a proposed-patch report; the human
 *     picks values and edits scaffolding.
 *   - Phase-arbitration knobs (`bot/phases/...`, `bot/manaOverflowTrigger`)
 *     are sim-only per the OL-746 override-flow contract — solver tunes
 *     those in a separate sim pass after per-phase params converge (not
 *     wired in this rung).
 *
 * # Knob kinds — tunables vs planner-params
 *
 * Two perturbation surfaces, dispatched by `KnobAssignment.kind`:
 *
 *   - `tunable` — keys in `LooperTunableKey` (subset wired through the
 *     projector). Routed via the resolved `tuning` snapshot at
 *     `projectArc` call time and via `tunableScope: toScope(...)` at
 *     `buildLooperSimEngine` call time. The historical surface.
 *   - `planner-param` — paths into `PlannerParams`
 *     (`manaUpOversupplyFactor`, `progressionTarget.<id>`,
 *     `talentOverflowThreshold`). Routed via the strategy's per-evaluation
 *     `params` clone at `projectArc` call time and via
 *     `plannerParamsOverride` at `buildLooperSimEngine` call time. Opens
 *     the planner's own dials to bisection — the strategy's content-shape
 *     intent is part of the tunable surface, not just the data baseline.
 *
 * Both kinds share `bisectTuner`'s 1-D scalar contract — the discriminator
 * routes inside the sampler closure. `tradeThreshold` is intentionally
 * excluded (its `'never'` literal doesn't fit a scalar bracket); file as
 * expansion when needed.
 *
 * # Verify-only beats
 *
 * Some beats are content-shape-determined, not knob-tunable: their fire
 * time is dominated by xp curves, action ticks, and prereq web rather than
 * any single dial. `bisectTuner`-driven search produces a step-function
 * surface (∞ until a fit-threshold, then snaps to a near-constant) that
 * doesn't meaningfully tune to a window midpoint. `VERIFY_ONLY_BEATS`
 * names these — they're sim-verified under the converged proposals but
 * not bisected against. If a verify-only beat lands out-of-window, the
 * resolution surface is content rebalance (action manaCost, xp-curve
 * shape, prereq web), not solver extension.
 *
 * Run: `pnpm balance:solve:looper`. Skip `run.ts` per the OL-625
 * carry-forward gotcha. Companion script `pnpm balance:validate-projector:
 * looper` prints the projector-vs-sim diff table per beat under chosen
 * params (resolves OL-757's cross-loop drift uncertainty).
 *
 * Sync-risk note: `STRATEGY_PARAMS` mirrors the strategy snapshots in
 * `bot.ts` (`FARM_MANA_POOL_PARAMS`, `FARM_GOLD_BUFFER_PARAMS`,
 * `FARM_TALENT_PARAMS`). bot.ts doesn't export them — their role is
 * bot-internal — so we mirror values here. If bot.ts shifts, the solver's
 * proposed-patch report becomes a stale snapshot until this file syncs.
 */

import { bisectTuner, runUntil, type DecimalSource, type TunerResult } from 'open-loop-engine';
import { DEFAULT_LOOPER_DATA } from '../data';
import { ARC_BEATS, BEAT_WINDOWS } from './beats';
import { buildLooperSimEngine, BalanceBotRecommendationKey } from './bot';
import { type LooperTunables } from '../modules';
import {
  createBeatPredicates,
  projectArc,
  resolveTunables,
  type ProjectorProposal,
  type ResolvedLooperTunables,
} from './projector';
import { type PlannerParams } from './planner';

// ─── Strategy params (mirror of bot.ts internals) ─────────────────────────

const STRATEGY_PARAMS: Record<string, PlannerParams> = {
  'farm-mana-pool': {
    progressionTarget: { roam: 2, trail: 2, acquaint: 0, mark: 0 },
    manaUpOversupplyFactor: 1.0,
    tradeThreshold: 100,
    talentOverflowThreshold: 0,
  },
  'farm-gold-buffer': {
    progressionTarget: { acquaint: 2, roam: 3, trail: 0, mark: 0 },
    manaUpOversupplyFactor: 1.0,
    tradeThreshold: 50,
    talentOverflowThreshold: 0,
  },
  'farm-talent': {
    progressionTarget: { roam: 1, acquaint: 1, trail: 0, mark: 0 },
    manaUpOversupplyFactor: 1.0,
    tradeThreshold: 100,
    talentOverflowThreshold: 50,
  },
};

// ─── Per-strategy × per-beat knob assignment ──────────────────────────────
//
// Lock during ramp per OL-758's open uncertainty. Each entry names the
// knob the bisector perturbs and its bracket. Two kinds:
//
//   - `tunable` — `key: LooperTunableKey` (subset wired through projector)
//   - `planner-param` — `path: 'manaUpOversupplyFactor'
//                            | 'talentOverflowThreshold'
//                            | 'progressionTarget.<id>'`
//
// Brackets are wide on purpose — bisectTuner returns best-effort with
// direction-detection on the endpoints, so an over-wide bracket surfaces
// "unreachable" as the high endpoint rather than silently picking a
// degenerate value.

interface TunableKnob {
  kind: 'tunable';
  /** Key in LooperTunableKey (subset wired through projector). */
  key: string;
  lo: number;
  hi: number;
  /** Human-readable field for the report. */
  field: string;
}

interface PlannerParamKnob {
  kind: 'planner-param';
  /** Path into PlannerParams. Supported: `manaUpOversupplyFactor`,
   *  `talentOverflowThreshold`, `progressionTarget.<id>`. */
  path: string;
  lo: number;
  hi: number;
  /** Human-readable field for the report. */
  field: string;
}

type KnobAssignment = TunableKnob | PlannerParamKnob;

const KNOBS: Record<string, Record<string, KnobAssignment>> = {
  'farm-mana-pool': {
    // Beat-2 demoted to VERIFY_ONLY by OL-770 rung-1 retune — under (γ)
    // chunked Pass-5 (OL-768), `balance/initialMana` becomes a
    // step-function surface (15s plateau ↦ 45s plateau ↦ 75s plateau as
    // budget admits successive roam-chunks); no midpoint to bisect to.
    // Beats 4/5 are this strategy's tuned beats; 7/8 require wilds-zone
    // engagement which farm-mana-pool doesn't pursue (verified during
    // OL-770 ramp by sweeping initialMana up to 5000 — beat-7 only fires
    // at unrealistic budgets and out-of-window low).
    // 'beat-4': { kind: 'tunable', key: 'actions/crack/rewardRatio', ... }, // ramp ↑
    // 'beat-5': { kind: 'planner-param', path: 'manaUpOversupplyFactor', ... }, // ramp ↑
  },
  'farm-gold-buffer': {
    // 'beat-5': { kind: 'tunable', key: 'actions/trade/exchangeMult', ... }, // ramp ↑
  },
  'farm-talent': {
    // 'beat-?': { kind: 'tunable', key: 'balance/talentAccrualRatio', ... }, // ramp ↑
  },
};

// ─── Verify-only beats ────────────────────────────────────────────────────
//
// Beats whose fire time is content-shape-determined (xp curves, action
// ticks, prereq web), not knob-tunable. Sim-verified under the converged
// proposals but not bisected against:
//
//   - beat-1 — "queue ticks AND mana < initialMana": fires within ~1 tick
//     of any non-empty queue under any reasonable initialMana. Onboarding
//     signal, not a tuning surface.
//   - beat-2 — "first loop ends": under (γ) chunked Pass-5 (OL-768),
//     `balance/initialMana` becomes a step-function surface (15s plateau ↦
//     45s plateau ↦ 75s plateau as budget admits successive roam-chunks).
//     The 45s plateau corresponds to the canonical {roam:2, trail:2} +
//     chunkSize=4 plan: trainers (300 ticks) + 1 roam-chunk (600 ticks) =
//     900 ticks = 45s — fitted exactly. No continuous-knob alternative
//     found in rung-1 sweep: `actions/roam/manaCost` shifts beat-2
//     monotonically but cross-couples beats 7/8 too strongly (driving
//     them out of [30m, 60m] / [60m, 120m] windows).
//   - beat-3 — "any progressVar level ≥ 1": determined by the moment a
//     visible progression action's xp curve crosses level 0→1 (4 completions
//     under the canonical curve). f(initialMana), f(progressionTarget.<id>),
//     f(manaUpOversupplyFactor) are all step functions — ∞ until the plan
//     admits a roam(L1) chunk, then snaps to ~30s and stays there. No
//     midpoint to bisect to.
//   - beat-6 — "any talent.level ≥ 1 AND loop.count ≥ 2": multi-loop
//     strategy-arbitration territory per OL-746 leaf-3a synthesis. Phase-
//     arbitration knobs (`bot/...`) are sim-only; talent accrual is content-
//     shape-driven across the strategy roster.
//
// If a verify-only beat lands out-of-window, the resolution surface is
// content rebalance (manaCost magnitudes, xp curve shape, prereq web), not
// solver extension.

const VERIFY_ONLY_BEATS = new Set<string>(['beat-1', 'beat-2', 'beat-3', 'beat-6']);

// ─── Ramp gates ──────────────────────────────────────────────────────────
//
// Per per-project memory (`step solvers incrementally`): one strategy,
// one tuned beat + verify-only beats. Each rung should flush a log under
// two minutes. Lift gates as each level converges.

const ENABLED_STRATEGIES = new Set<string>(['farm-mana-pool']);
const ENABLED_BEATS = new Set<string>(['beat-1', 'beat-2', 'beat-3', 'beat-6']);
const PASSES = 1;

/** maxLoops cap per `projectArc` evaluation. Generous so beats 6-8 reach. */
const ARC_MAX_LOOPS = 50;
/** sim-verify budget cap. Mirrors Ambient's `beat-N[1] × 2.5` shape. */
const BUDGET_SEC = BEAT_WINDOWS['beat-8']![1] * 2.5;

// ─── Proposal state ──────────────────────────────────────────────────────

interface Proposed {
  /** Tunable proposals — keyed by `LooperTunableKey` path. */
  tunables: ProjectorProposal;
  /** Planner-param proposals — keyed by dotted PlannerParams path. */
  params: Record<string, number>;
}

function emptyProposed(): Proposed {
  return { tunables: {}, params: {} };
}

function toScope(t: ProjectorProposal): Partial<LooperTunables> {
  const scope: Partial<LooperTunables> = {};
  for (const [key, value] of Object.entries(t)) {
    if (value === undefined) continue;
    scope[key as keyof LooperTunables] = () => value;
  }
  return scope;
}

/**
 * Apply a flat dotted-path map of param overrides onto the strategy's
 * baseline. Supports the three path shapes the solver perturbs:
 * `manaUpOversupplyFactor`, `talentOverflowThreshold`,
 * `progressionTarget.<id>`. tradeThreshold's `'never'` literal isn't
 * scalar-bracket-friendly so it's intentionally not in scope.
 */
function mergeParams(base: PlannerParams, overrides: Record<string, number>): PlannerParams {
  const out: PlannerParams = {
    ...base,
    progressionTarget: { ...base.progressionTarget },
  };
  for (const [path, value] of Object.entries(overrides)) {
    if (path === 'manaUpOversupplyFactor') {
      out.manaUpOversupplyFactor = value;
    } else if (path === 'talentOverflowThreshold') {
      out.talentOverflowThreshold = value;
    } else if (path.startsWith('progressionTarget.')) {
      const id = path.slice('progressionTarget.'.length);
      out.progressionTarget[id] = value;
    } else {
      throw new Error(`unknown planner-param path: ${path}`);
    }
  }
  return out;
}

// ─── Projector sampler ───────────────────────────────────────────────────

interface SamplerContext {
  proposed: Proposed;
  /** Strategy baseline; planner-param proposals are merged onto this per evaluation. */
  baseParams: PlannerParams;
}

/**
 * Sample a beat's projected fire time under the proposal map ∪
 * {knob-target: candidateValue}. Closed-form via `projectArc` — orders of
 * magnitude faster than the engine-as-oracle path Ambient's solver uses.
 *
 * Dispatch on `knob.kind` routes the candidate into the right surface:
 * tunable → resolved snapshot, planner-param → params clone.
 */
function projectBeatFire(
  ctx: SamplerContext,
  beatId: string,
  knob: KnobAssignment,
  candidateValue: number,
): number {
  let tuning: ResolvedLooperTunables;
  let params: PlannerParams;
  if (knob.kind === 'tunable') {
    tuning = resolveTunables({ ...ctx.proposed.tunables, [knob.key]: candidateValue });
    params = mergeParams(ctx.baseParams, ctx.proposed.params);
  } else {
    tuning = resolveTunables(ctx.proposed.tunables);
    params = mergeParams(ctx.baseParams, {
      ...ctx.proposed.params,
      [knob.path]: candidateValue,
    });
  }
  const predicates = createBeatPredicates(DEFAULT_LOOPER_DATA, tuning);
  const predicate = predicates[beatId];
  if (!predicate) throw new Error(`no synth predicate for ${beatId}`);
  const arc = projectArc(DEFAULT_LOOPER_DATA, params, {
    breakPredicate: predicate,
    maxLoops: ARC_MAX_LOOPS,
    tuning,
  });
  return arc.fireSec ?? Infinity;
}

// ─── Sim verification ────────────────────────────────────────────────────

interface VerifyRow {
  beatId: string;
  window: [number, number];
  firedAt: number;
  inWindow: boolean;
  /** Verify-only beats are flagged so the report can distinguish from tuned beats. */
  verifyOnly: boolean;
}

/**
 * Sim-verify the converged proposals under the strategy's baseline merged
 * with planner-param proposals. Seeds both `plannerParamsOverride` and
 * `tunableScope` at engine build time so connect()'s initial applyPlan
 * reflects them on loop 1. Freezes the bot at the merged params (autoApply
 * off) so phase arbitration doesn't shift the bot mid-arc, runs `runUntil`
 * per beat predicate.
 *
 * Per-strategy proposals are uniform across all verified beats, so a single
 * engine + scope-push works; importSave between beats resets the within-arc
 * mutable state without disturbing the install-time tuning scope.
 */
function simVerifyStrategy(
  strategyId: string,
  baseParams: PlannerParams,
  proposed: Proposed,
  beats: readonly string[],
): VerifyRow[] {
  const engine = buildLooperSimEngine(undefined, {
    plannerParamsOverride: mergeParams(baseParams, proposed.params),
    tunableScope: toScope(proposed.tunables),
  });
  const rec = engine.tryInject(BalanceBotRecommendationKey)!;

  rec.autoApply.value = false;
  const initialBlob = engine.saveManager!.exportSave();

  const rows: VerifyRow[] = beats.map((beatId) => {
    const window = BEAT_WINDOWS[beatId]!;
    const beat = ARC_BEATS.find((b) => b.id === beatId)!;
    const result = engine.saveManager!.importSave(initialBlob);
    if (!result.success) throw new Error(`importSave failed for verify ${beatId}`);
    rec.autoApply.value = false;
    const { terminated, elapsedSimulated } = runUntil({
      engine,
      until: () => beat.predicate(engine),
      maxSimTime: BUDGET_SEC,
      tickDelta: 1,
    });
    const firedAt = terminated === 'predicate' ? elapsedSimulated : Infinity;
    return {
      beatId,
      window,
      firedAt,
      inWindow: isFinite(firedAt) && firedAt >= window[0] && firedAt <= window[1],
      verifyOnly: VERIFY_ONLY_BEATS.has(beatId),
    };
  });

  void strategyId;
  return rows;
}

// ─── Per-beat solve (Gauss-Seidel inner) ─────────────────────────────────

interface BeatSolve {
  strategyId: string;
  beatId: string;
  field: string;
  current: number;
  currentFireTime: number;
  proposed: number;
  proposedFireTime: number;
  direction: 'forward' | 'inverted';
  iterations: number;
  window: [number, number];
}

function solveBeat(
  ctx: SamplerContext,
  strategyId: string,
  beatId: string,
  knob: KnobAssignment,
): BeatSolve | undefined {
  const window = BEAT_WINDOWS[beatId];
  if (!window) return undefined;
  const target = (window[0] + window[1]) / 2;

  const currentValue = currentKnobValue(strategyId, knob, ctx.proposed);
  const currentFire = projectBeatFire(ctx, beatId, knob, currentValue);

  const result: TunerResult = bisectTuner({
    lo: knob.lo,
    hi: knob.hi,
    targetSec: target,
    sampler: (v) => projectBeatFire(ctx, beatId, knob, v),
  });
  const proposedValue = roundProposal(knob, result.value);
  if (knob.kind === 'tunable') {
    ctx.proposed.tunables[knob.key] = proposedValue;
  } else {
    ctx.proposed.params[knob.path] = proposedValue;
  }

  return {
    strategyId,
    beatId,
    field: knob.field,
    current: currentValue,
    currentFireTime: currentFire,
    proposed: proposedValue,
    proposedFireTime: result.time,
    direction: result.direction,
    iterations: result.iterations,
    window,
  };
}

/**
 * Read the current knob value from the proposal map, falling back to the
 * data baseline (tunables) or the strategy baseline (planner-params).
 */
function currentKnobValue(strategyId: string, knob: KnobAssignment, proposed: Proposed): number {
  if (knob.kind === 'tunable') {
    const v = proposed.tunables[knob.key];
    if (v !== undefined) return Number(v);
    return Number(readDataDefault(knob.key));
  }
  const v = proposed.params[knob.path];
  if (v !== undefined) return v;
  return readStrategyParamDefault(strategyId, knob.path);
}

/**
 * Read the data baseline for a tunable key. Limited to the keys this
 * solver touches; expand alongside `KNOBS` as the ramp lifts.
 */
function readDataDefault(key: string): DecimalSource {
  if (key === 'balance/initialMana') return DEFAULT_LOOPER_DATA.balance.initialMana;
  if (key === 'balance/costDivisor') return DEFAULT_LOOPER_DATA.balance.costDivisor;
  if (key === 'balance/talentAccrualRatio') {
    return DEFAULT_LOOPER_DATA.balance.talentAccrualRatio;
  }
  // actions/<id>/<field>
  const actionMatch = key.match(/^actions\/([^/]+)\/(manaCost|rewardRatio|exchangeMult)$/);
  if (actionMatch) {
    const [, id, field] = actionMatch;
    const def = DEFAULT_LOOPER_DATA.actions.find((d) => d.id === id);
    if (!def) throw new Error(`unknown action id ${id} in solver knob ${key}`);
    if (field === 'manaCost') return def.manaCost;
    if (field === 'rewardRatio' && def.type === 'regular') return def.rewardRatio;
    if (field === 'exchangeMult' && def.type === 'basic' && def.exchangeMult !== undefined) {
      return def.exchangeMult;
    }
    throw new Error(`action ${id} has no ${field} field for solver knob ${key}`);
  }
  // progressVars/<pvId>/scales/<rvId>/perLevel
  const pvMatch = key.match(/^progressVars\/([^/]+)\/scales\/([^/]+)\/perLevel$/);
  if (pvMatch) {
    const [, pvId, rvId] = pvMatch;
    const pvDef = DEFAULT_LOOPER_DATA.progressVars.find((d) => d.id === pvId);
    const scale = pvDef?.scales.find((s) => s.regularVarId === rvId);
    if (!scale) throw new Error(`unknown progressVar/scale ${pvId}/${rvId} in solver knob ${key}`);
    return scale.perLevel;
  }
  throw new Error(`unrecognized solver knob ${key}`);
}

/**
 * Read the strategy baseline for a planner-param path. Mirrors
 * `STRATEGY_PARAMS[strategyId]`; throws on unrecognized paths so KNOBS
 * authoring errors surface loudly rather than silently using `0`.
 */
function readStrategyParamDefault(strategyId: string, path: string): number {
  const params = STRATEGY_PARAMS[strategyId];
  if (!params) throw new Error(`unknown strategy ${strategyId}`);
  if (path === 'manaUpOversupplyFactor') return params.manaUpOversupplyFactor;
  if (path === 'talentOverflowThreshold') return params.talentOverflowThreshold;
  if (path.startsWith('progressionTarget.')) {
    const id = path.slice('progressionTarget.'.length);
    return params.progressionTarget[id] ?? 0;
  }
  throw new Error(`unrecognized planner-param path: ${path}`);
}

/**
 * Round a bisection midpoint to a sensible patch value:
 *   - `progressionTarget.*` → integer (target deltas are integer-valued).
 *   - Other planner-params (`manaUpOversupplyFactor`, etc.) → 4 sig figs.
 *   - `balance/talentAccrualRatio`, `actions/<id>/exchangeMult` → ratio rounding.
 *   - Other tunables → integer.
 */
function roundProposal(knob: KnobAssignment, value: number): number {
  if (knob.kind === 'planner-param') {
    if (knob.path.startsWith('progressionTarget.')) return Math.round(value);
    return Number(value.toFixed(4));
  }
  if (knob.key === 'balance/talentAccrualRatio') return Number(value.toFixed(4));
  if (knob.key.endsWith('/exchangeMult')) return Number(value.toFixed(2));
  return Math.round(value);
}

// ─── Strategy well-formedness smoke ──────────────────────────────────────
//
// Pre-bisection bootstrap check per OL-770 in-scope foundation: walk N
// loops via `projectArc` against the strategy baseline and surface
// per-loop `manaAdded`. Catches OL-756 farm-mana-pool's
// `progressionTarget: {}`-class bug where the strategy compiles + runs but
// never bootstraps mana growth (planner-empty-progression → no
// progressVar level-ups → regularVar pool stays at zero capacity → no
// manapot harvests possible). Closed-form via `projectArc` so it adds
// negligible cost.
//
// Advisory, not blocking. Some strategies (notably farm-mana-pool) have
// a multi-arc bootstrap profile under canonical content: crack's cycle
// cost (rewardRatio × manaCost = 2000 ticks) exceeds the fresh-loop
// budget by a wide margin until Talent compounds adjustedTicks low
// enough that the cycle becomes positive-EV. For those strategies,
// 10-loop manaAdded == 0 is structural, not buggy. The smoke prints the
// per-loop array as a discovery artifact and lets the ramp proceed; the
// human reads the array against strategy intent.

const SMOKE_LOOPS = 10;

interface SmokeResult {
  ok: boolean;
  manaAddedPerLoop: number[];
  reason?: string;
}

function smokeStrategy(strategyId: string, baseParams: PlannerParams): SmokeResult {
  void strategyId;
  const arc = projectArc(DEFAULT_LOOPER_DATA, baseParams, {
    breakPredicate: () => false,
    maxLoops: SMOKE_LOOPS,
  });
  const manaAddedPerLoop = arc.loops.map((l) => l.manaAdded);
  const maxManaAdded = manaAddedPerLoop.length > 0 ? Math.max(...manaAddedPerLoop) : 0;
  if (maxManaAdded <= 0) {
    return {
      ok: false,
      manaAddedPerLoop,
      reason:
        'manaAdded === 0 across all loops — strategy bootstrap broken. ' +
        'Likely progressionTarget:{} (no progression actions enqueued), ' +
        'or unreachable manapot harvest under canonical content (regularVar ' +
        'pool stays at zero capacity, no good-checks fire).',
    };
  }
  return { ok: true, manaAddedPerLoop };
}

// ─── Orchestrator ────────────────────────────────────────────────────────

function solveStrategy(strategyId: string): {
  proposed: Proposed;
  solves: BeatSolve[];
  verified: VerifyRow[];
  smoke: SmokeResult;
} {
  const baseParams = STRATEGY_PARAMS[strategyId];
  if (!baseParams) throw new Error(`unknown strategy ${strategyId}`);
  const proposed = emptyProposed();
  const ctx: SamplerContext = { proposed, baseParams };
  const solves: BeatSolve[] = [];

  // Smoke is advisory — failure surfaces as an ADVISORY note in the
  // report, but the ramp continues. Strategies with multi-arc bootstrap
  // profiles (manaAdded growth gated on Talent compounding) need the
  // ramp's later beats to characterize them; pre-blocking would prevent
  // solver discovery from progressing.
  const smoke = smokeStrategy(strategyId, baseParams);

  const knobsForStrategy = KNOBS[strategyId] ?? {};

  for (let pass = 1; pass <= PASSES; pass++) {
    for (const beatId of Object.keys(knobsForStrategy)) {
      if (!ENABLED_BEATS.has(beatId)) continue;
      const knob = knobsForStrategy[beatId]!;
      const solve = solveBeat(ctx, strategyId, beatId, knob);
      if (solve) solves.push({ ...solve, beatId: `${beatId}#p${pass}` });
    }
  }

  // Sim-verify covers tuned beats AND verify-only beats — both are
  // evaluated under the same converged proposal map.
  const verifyBeatSet = new Set<string>();
  for (const beatId of Object.keys(knobsForStrategy)) {
    if (ENABLED_BEATS.has(beatId)) verifyBeatSet.add(beatId);
  }
  for (const beatId of VERIFY_ONLY_BEATS) {
    if (ENABLED_BEATS.has(beatId)) verifyBeatSet.add(beatId);
  }
  const verifyBeats = [...verifyBeatSet].sort();
  const verified =
    verifyBeats.length > 0 ? simVerifyStrategy(strategyId, baseParams, proposed, verifyBeats) : [];

  return { proposed, solves, verified, smoke };
}

// ─── Rendering ───────────────────────────────────────────────────────────

function fmt(sec: number): string {
  if (!isFinite(sec)) return '∞ (never)';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function fmtWindow(w: [number, number]): string {
  return `${fmt(w[0])}–${fmt(w[1])}`;
}

function fmtNum(n: number): string {
  if (!isFinite(n)) return '∞';
  if (Math.abs(n) >= 1e6) return n.toExponential(2);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(4);
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

// ─── main ────────────────────────────────────────────────────────────────

function main(): void {
  const t0 = Date.now();

  console.log('# Looper balance solver — projector inner / sim verify\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log('Per-strategy bisection over `projectArc` (closed-form). Sim-verifies');
  console.log('via `runUntil` after each strategy converges.');
  console.log(`Outer Gauss-Seidel passes: ${PASSES}.`);
  console.log('No data files mutated — proposed-patch report only.\n');

  console.log(
    `Enabled strategies: ${[...ENABLED_STRATEGIES].join(', ') || '(none)'}\n` +
      `Enabled beats:      ${[...ENABLED_BEATS].join(', ') || '(none)'}\n` +
      `Verify-only beats:  ${[...VERIFY_ONLY_BEATS].join(', ') || '(none)'}\n`,
  );

  const allProposals: Array<{ strategy: string; proposed: Proposed }> = [];
  const enabledVerifyOnly = [...VERIFY_ONLY_BEATS].some((b) => ENABLED_BEATS.has(b));

  for (const strategyId of ENABLED_STRATEGIES) {
    const knobsForStrategy = KNOBS[strategyId] ?? {};
    const hasEnabledKnobs = Object.keys(knobsForStrategy).some((b) => ENABLED_BEATS.has(b));
    if (!hasEnabledKnobs && !enabledVerifyOnly) {
      console.log(`## ${strategyId}\n\n  no enabled beats — skip.\n`);
      continue;
    }
    console.log(`## ${strategyId}\n`);
    const { proposed, solves, verified, smoke } = solveStrategy(strategyId);
    allProposals.push({ strategy: strategyId, proposed });

    console.log(
      `### smoke (${strategyId})\n\n` +
        `manaAdded per loop (${smoke.manaAddedPerLoop.length} loops): ` +
        smoke.manaAddedPerLoop.map((v) => v.toFixed(0)).join(', ') +
        '\n',
    );
    if (!smoke.ok) {
      console.log(`SMOKE FAILED: ${smoke.reason}\n`);
      console.log(`Skipping bisection — fix strategy params before re-running.\n`);
      continue;
    }

    if (solves.length > 0) {
      console.log(
        renderTable(
          ['beat', 'field', 'window', 'current', 'currT', 'proposed', 'propT', 'dir', 'it'],
          solves.map((s) => [
            s.beatId,
            s.field,
            fmtWindow(s.window),
            fmtNum(s.current),
            fmt(s.currentFireTime),
            fmtNum(s.proposed),
            fmt(s.proposedFireTime),
            s.direction,
            String(s.iterations),
          ]),
        ),
      );
      console.log();
    } else {
      console.log('  (no tuned beats — verify-only run)\n');
    }

    if (verified.length > 0) {
      console.log(`### sim-verify (${strategyId})\n`);
      console.log(
        renderTable(
          ['beat', 'kind', 'window', 'fired at', 'in window'],
          verified.map((v) => [
            v.beatId,
            v.verifyOnly ? 'verify-only' : 'tuned',
            fmtWindow(v.window),
            fmt(v.firedAt),
            v.inWindow ? 'yes' : 'NO',
          ]),
        ),
      );
      console.log();
      const offTarget = verified.filter((v) => !v.inWindow);
      if (offTarget.length > 0) {
        const tunedOff = offTarget.filter((v) => !v.verifyOnly);
        const verifyOff = offTarget.filter((v) => v.verifyOnly);
        if (tunedOff.length > 0) {
          console.log(
            `Sim-vs-projector drift: ${tunedOff.length} tuned beat(s) out-of-window ` +
              `under engine truth. Surface for the ` +
              `\`balance:validate-projector:looper\` script to characterize.\n`,
          );
        }
        if (verifyOff.length > 0) {
          console.log(
            `Verify-only out-of-window: ${verifyOff.length} beat(s). Resolution ` +
              `surface is content rebalance (manaCost magnitudes, xp curve shape, ` +
              `prereq web), not solver extension.\n`,
          );
        }
      }
    }
  }

  console.log('## Apply patch — exact values\n');
  for (const { strategy, proposed } of allProposals) {
    const tunableEntries = Object.entries(proposed.tunables).filter(([, v]) => v !== undefined);
    const paramEntries = Object.entries(proposed.params);
    if (tunableEntries.length === 0 && paramEntries.length === 0) continue;
    console.log(`### ${strategy}`);
    for (const [key, value] of tunableEntries) {
      console.log(`  ${key} = ${fmtNum(Number(value))}`);
    }
    for (const [path, value] of paramEntries) {
      console.log(`  params/${path} = ${fmtNum(value)}`);
    }
    console.log();
  }

  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
