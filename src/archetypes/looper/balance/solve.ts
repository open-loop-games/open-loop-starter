/**
 * Looper balance solver — math-first, Tier-B Phase-Shifter shape.
 *
 * Per-strategy outer loop × per-beat inner bisection. Each farm strategy
 * (`farm-mana-pool`, `farm-gold-buffer`, `farm-talent`) gets its own
 * `PlannerParams` set; for each enabled beat, the solver bisects a
 * relevant tunable against `projectArc` (closed-form, fast) targeting the
 * beat window midpoint, then sim-verifies the converged proposals via
 * `runUntil` + `pushScope` against `LooperTuningRegistryKey`.
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
import { buildLooperSimEngine, BalanceBotParamsKey, BalanceBotRecommendationKey } from './bot';
import { LooperTuningRegistryKey, type LooperTunables } from '../modules';
import {
  createBeatPredicates,
  projectArc,
  resolveTunables,
  type ProjectorProposal,
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
    progressionTarget: { acquaint: 2, roam: 1, trail: 0, mark: 0 },
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
// Lock during ramp per OL-758's open uncertainty: standard starting
// candidates from the task body, refined as each rung lands. Each entry
// names the LooperTunableKey the bisector perturbs and its bracket.
//
// Brackets are wide on purpose — bisectTuner returns best-effort with
// direction-detection on the endpoints, so an over-wide bracket surfaces
// "unreachable" as the high endpoint rather than silently picking a
// degenerate value.

interface KnobAssignment {
  /** Key in LooperTunableKey (subset wired through projector). */
  key: string;
  /** Bisection bracket. lo / hi must be finite numbers. */
  lo: number;
  hi: number;
  /** Human-readable field for the report. */
  field: string;
}

const KNOBS: Record<string, Record<string, KnobAssignment>> = {
  'farm-mana-pool': {
    // Beat-2 — "first loop ends". Cost-like knob: higher initialMana →
    // later loop end. Forward-direction bisect.
    'beat-2': {
      key: 'balance/initialMana',
      lo: 50,
      hi: 2000,
      field: 'balance.initialMana',
    },
    // 'beat-3': { key: 'progressVars/roam/scales/cache/perLevel', ... }, // ramp ↑
    // 'beat-4': { key: 'actions/stretch/manaCost', ... },                 // ramp ↑
  },
  'farm-gold-buffer': {
    // 'beat-5': { key: 'actions/trade/exchangeMult', ... },               // ramp ↑
    // 'beat-?': { key: 'progressVars/acquaint/scales/errand/perLevel' },  // ramp ↑
  },
  'farm-talent': {
    // 'beat-6': { key: 'balance/talentAccrualRatio', ... },               // ramp ↑
  },
};

// ─── Ramp gates ──────────────────────────────────────────────────────────
//
// First viable rung per per-project memory (`step solvers incrementally`):
// one strategy, one beat, one pass. Each rung should flush a log under
// two minutes. Lift gates as each level converges.

const ENABLED_STRATEGIES = new Set<string>(['farm-mana-pool']);
const ENABLED_BEATS = new Set<string>(['beat-2']);
const PASSES = 1;

/** maxLoops cap per `projectArc` evaluation. Generous so beats 6-8 reach. */
const ARC_MAX_LOOPS = 50;
/** sim-verify budget cap. Mirrors Ambient's `beat-N[1] × 2.5` shape. */
const BUDGET_SEC = BEAT_WINDOWS['beat-8']![1] * 2.5;

// ─── Proposal state ──────────────────────────────────────────────────────

type Proposed = ProjectorProposal;

function toScope(p: Proposed): Partial<LooperTunables> {
  const scope: Partial<LooperTunables> = {};
  for (const [key, value] of Object.entries(p)) {
    if (value === undefined) continue;
    scope[key as keyof LooperTunables] = () => value;
  }
  return scope;
}

// ─── Projector sampler ───────────────────────────────────────────────────

interface SamplerContext {
  proposed: Proposed;
  params: PlannerParams;
}

/**
 * Sample a beat's projected fire time under `proposed ∪ {candidateKey:
 * candidateValue}` against the strategy's `params`. Closed-form via
 * `projectArc` — orders of magnitude faster than the engine-as-oracle path
 * Ambient's solver uses.
 */
function projectBeatFire(
  ctx: SamplerContext,
  beatId: string,
  candidateKey: string,
  candidateValue: number,
): number {
  const tuning = resolveTunables({ ...ctx.proposed, [candidateKey]: candidateValue });
  const predicates = createBeatPredicates(DEFAULT_LOOPER_DATA);
  const predicate = predicates[beatId];
  if (!predicate) throw new Error(`no synth predicate for ${beatId}`);
  const arc = projectArc(DEFAULT_LOOPER_DATA, ctx.params, {
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
}

/**
 * Sim-verify the converged proposals under the strategy's planner-params.
 * Pushes the resolved tuning onto `LooperTuningRegistryKey`, freezes the
 * bot at the strategy's params (autoApply off) so phase arbitration
 * doesn't shift the bot mid-arc, runs `runUntil` per beat predicate.
 *
 * Single engine per call — `importSave` resets between predicates so
 * fire-time samples are independent. Mirrors Ambient's pattern; the
 * scope-leak guard catches an asymmetric push/pop.
 */
function simVerifyStrategy(
  strategyId: string,
  params: PlannerParams,
  proposed: Proposed,
  beats: readonly string[],
): VerifyRow[] {
  const engine = buildLooperSimEngine();
  const registry = engine.tryInject(LooperTuningRegistryKey)!;
  const rec = engine.tryInject(BalanceBotRecommendationKey)!;
  const paramsHandle = engine.tryInject(BalanceBotParamsKey)!;

  rec.autoApply.value = false;
  paramsHandle.write(params);
  const initialBlob = engine.saveManager!.exportSave();

  const rows: VerifyRow[] = beats.map((beatId) => {
    const window = BEAT_WINDOWS[beatId]!;
    const beat = ARC_BEATS.find((b) => b.id === beatId)!;
    const result = engine.saveManager!.importSave(initialBlob);
    if (!result.success) throw new Error(`importSave failed for verify ${beatId}`);
    paramsHandle.write(params);
    rec.autoApply.value = false;
    const cleanup = registry.pushScope(`verify:${strategyId}/${beatId}`, toScope(proposed));
    try {
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
      };
    } finally {
      cleanup();
    }
  });

  if (registry.scopeDepth !== 0) {
    throw new Error(`scope leak after ${strategyId} verify: depth=${registry.scopeDepth}`);
  }
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

  const currentValue = Number(ctx.proposed[knob.key] ?? readDataDefault(knob.key));
  const currentFire = projectBeatFire(ctx, beatId, knob.key, currentValue);

  const result: TunerResult = bisectTuner({
    lo: knob.lo,
    hi: knob.hi,
    targetSec: target,
    sampler: (v) => projectBeatFire(ctx, beatId, knob.key, v),
  });
  const proposedValue = roundProposal(knob.key, result.value);
  ctx.proposed[knob.key] = proposedValue;

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
 * Round a bisection midpoint to a sensible patch value. Integer-valued
 * tunables (mana costs, pool magnitudes, reward ratios) clamp to integers;
 * ratio-shaped tunables (talentAccrualRatio, exchangeMult) keep 4 sig figs.
 */
function roundProposal(key: string, value: number): number {
  if (key === 'balance/talentAccrualRatio') return Number(value.toFixed(4));
  if (key.endsWith('/exchangeMult')) return Number(value.toFixed(2));
  return Math.round(value);
}

// ─── Orchestrator ────────────────────────────────────────────────────────

function solveStrategy(strategyId: string): {
  proposed: Proposed;
  solves: BeatSolve[];
  verified: VerifyRow[];
} {
  const params = STRATEGY_PARAMS[strategyId];
  if (!params) throw new Error(`unknown strategy ${strategyId}`);
  const proposed: Proposed = {};
  const ctx: SamplerContext = { proposed, params };
  const solves: BeatSolve[] = [];

  for (let pass = 1; pass <= PASSES; pass++) {
    for (const beatId of Object.keys(KNOBS[strategyId] ?? {})) {
      if (!ENABLED_BEATS.has(beatId)) continue;
      const knob = KNOBS[strategyId]![beatId]!;
      const solve = solveBeat(ctx, strategyId, beatId, knob);
      if (solve) solves.push({ ...solve, beatId: `${beatId}#p${pass}` });
    }
  }

  const verifyBeats = Object.keys(KNOBS[strategyId] ?? {}).filter((b) => ENABLED_BEATS.has(b));
  const verified =
    verifyBeats.length > 0 ? simVerifyStrategy(strategyId, params, proposed, verifyBeats) : [];

  return { proposed, solves, verified };
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
  console.log('via `runUntil` + `pushScope` after each strategy converges.');
  console.log(`Outer Gauss-Seidel passes: ${PASSES}.`);
  console.log('No data files mutated — proposed-patch report only.\n');

  console.log(
    `Enabled strategies: ${[...ENABLED_STRATEGIES].join(', ') || '(none)'}\n` +
      `Enabled beats:      ${[...ENABLED_BEATS].join(', ') || '(none)'}\n`,
  );

  const allProposals: Array<{ strategy: string; proposed: Proposed }> = [];

  for (const strategyId of ENABLED_STRATEGIES) {
    if (!(strategyId in KNOBS)) {
      console.log(`## ${strategyId}\n\n  no KNOBS entry — skip.\n`);
      continue;
    }
    console.log(`## ${strategyId}\n`);
    const { proposed, solves, verified } = solveStrategy(strategyId);
    allProposals.push({ strategy: strategyId, proposed });

    if (solves.length === 0) {
      console.log('  no enabled beats matched — skip.\n');
      continue;
    }

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

    if (verified.length > 0) {
      console.log(`### sim-verify (${strategyId})\n`);
      console.log(
        renderTable(
          ['beat', 'window', 'fired at', 'in window'],
          verified.map((v) => [
            v.beatId,
            fmtWindow(v.window),
            fmt(v.firedAt),
            v.inWindow ? 'yes' : 'NO',
          ]),
        ),
      );
      console.log();
      const offTarget = verified.filter((v) => !v.inWindow);
      if (offTarget.length > 0) {
        console.log(
          `Sim-vs-projector drift: ${offTarget.length} beat(s) in projector ` +
            `convergence are out-of-window under engine truth. Surface for the ` +
            `\`balance:validate-projector:looper\` script to characterize.\n`,
        );
      }
    }
  }

  console.log('## Apply patch — exact values\n');
  for (const { strategy, proposed } of allProposals) {
    if (Object.keys(proposed).length === 0) continue;
    console.log(`### ${strategy}`);
    for (const [key, value] of Object.entries(proposed)) {
      if (value === undefined) continue;
      console.log(`  ${key} = ${fmtNum(Number(value))}`);
    }
    console.log();
  }

  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
