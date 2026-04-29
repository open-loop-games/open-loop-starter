/**
 * Looper closed-form beat-fire-time projector — math-first balance companion.
 *
 * Predicts when a beat fires from the planner's static-cost view of the arc,
 * with no engine forward-sim. Pairs with the sim oracle for verification:
 * solver searches the projector's surface (fast), sim confirms the chosen
 * knob set lands beats inside their windows (truth).
 *
 * # Static-cost (Option A) discipline
 *
 * Capability `adjustedTicks` is read once at plan-build time and applied
 * uniformly across all completions of an action within a single loop. Real
 * cost decreases mid-loop as Level XP accrues, but mirroring the planner's
 * static budget keeps the projector aligned with the queue plan it scores.
 * Cross-loop, capability Level XP zeroes (per-loop reset) — Talent persists,
 * so cost reduction across loops flows through the Talent → faster Level →
 * cheaper actions chain at every fresh plan-build.
 *
 * # Stepwise reward semantics
 *
 * Per-completion reward emission matches the engine: regular-action
 * `rewardEffects` fire only when `checked % rewardRatio === 0`. Averaged
 * `manaPerCompletion` (used by the planner for budget allocation) would
 * predict beat-4 (`manaAdded > 0`) at completion 1 instead of completion N
 * — so the integrator increments `checked`/`good` exactly like the engine
 * does in `regular-vars.ts`.
 *
 * # Multi-loop projection
 *
 * `integrateLoop` mutates a synthetic state object in place. `projectArc`
 * repeats the integrator across loops, applying retention (Talent XP,
 * action timesCompleted, progressVar XP, regularVar `total`) and reset
 * (capability Level XP, regularVar checked/good, mana → initialMana,
 * gold → 0) at each boundary. The retention key list mirrors
 * `looper/modules/loop.ts:99-104`; duplicated 5 lines projector-side
 * because the second-consumer threshold for sharing isn't met.
 *
 * Plan regeneration on loops 2+ uses `createSyntheticAccessor`, which
 * satisfies `PlannerAccessor` against the synthetic state. The planner
 * stays unchanged — same `generatePlan` + `projectActionVectors` call
 * sites, different accessor.
 */

import type { DecimalSource, InjectionKey } from 'open-loop-engine';
import {
  type ActionDef,
  type CapabilityDef,
  type LooperData,
  type ProgressVarDef,
  type RegularVarDef,
} from '../data/types';
import {
  ActionsKey,
  CapabilitiesKey,
  InitialManaKey,
  LoopKey,
  LooperDataKey,
  ProgressVarsKey,
  RegularVarsKey,
} from '../modules';
import {
  DEFAULT_PARAMS,
  generatePlan,
  projectActionVectors,
  type ActionVector,
  type PlannerAccessor,
  type PlannerParams,
  type PlannedItem,
} from './planner';

/** Engine TPS — mana drains at 1 per engine tick while a queue action runs. */
export const DEFAULT_TPS = 20;

// ─── Tunable resolution ──────────────────────────────────────────────────

/**
 * Resolved tunable snapshot — a flat key→number map mirroring
 * `LooperTunableKey`. Solver merges its `Partial<LooperTunables>` proposal
 * onto the data baseline once per evaluation, hands the snapshot to
 * `projectArc` via `options.tuning`. Read sites use `tuning?.[key] ??
 * <data fallback>`, so the data baseline stays the source of truth when
 * `tuning` is omitted (preserves the existing projector tests).
 *
 * Strict subset of the sim's `LooperTunables` surface — phase-arbitration
 * knobs (`bot/phases/...`, `bot/manaOverflowTrigger`) are sim-only because
 * the projector doesn't model bot arbitration. `resolveTunables` drops
 * those keys at narrow time so callers can hand the same proposal to both
 * sim (`pushScope`) and projector (`tuning`).
 */
export type ResolvedLooperTunables = Record<string, number>;

/** Solver-side proposal map, keyed by `LooperTunableKey`. */
export type ProjectorProposal = Partial<Record<string, DecimalSource>>;

/**
 * Narrow a solver proposal to the projector's resolved-number surface.
 * Drops `bot/...` keys (sim-only phase-arbitration) so a single proposal
 * map drives both verification paths cleanly.
 */
export function resolveTunables(proposed: ProjectorProposal): ResolvedLooperTunables {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(proposed)) {
    if (value === undefined) continue;
    if (key.startsWith('bot/')) continue;
    out[key] = Number(value);
  }
  return out;
}

/**
 * Read a tunable with explicit `undefined` check — `?? fallback` would
 * collapse a deliberately-zero proposed value (e.g., `perLevel: 0` to
 * disable a regularVar contribution) onto the data baseline.
 */
function readTunable(
  tuning: ResolvedLooperTunables | undefined,
  key: string,
  fallback: DecimalSource,
): number {
  const t = tuning?.[key];
  return t === undefined ? Number(fallback) : t;
}

// ─── Synthetic state ─────────────────────────────────────────────────────

/**
 * Minimal mirror of the looper module surfaces, projector-side only. Tracks
 * the cross-loop state that retention preserves and the within-loop state
 * the integrator mutates per completion. Per-loop scratch (action progress
 * within a completion, queue cursor) is not modelled — the integrator
 * walks completions atomically.
 */
export interface SyntheticLooperState {
  /** Capability Level + Talent XP. Level resets per loop; Talent persists. */
  capabilities: Map<string, { levelXp: number; talentXp: number }>;
  /** ProgressVar XP — persistent across loops. */
  progressVars: Map<string, number>;
  /** RegularVar pool state. `total` is persistent (derived from progressVar levels); `checked`/`good` reset per loop. */
  regularVars: Map<string, { total: number; checked: number; good: number }>;
  /** Action `timesCompleted` — persistent. */
  actions: Map<string, number>;
  /**
   * Cross-loop counters. `arcElapsedSec` aggregates each loop's elapsed
   * seconds. `manaAddedThisLoop` mirrors the engine's `ManaAddedKey` —
   * resets to 0 on each loop boundary.
   */
  loop: { count: number; arcElapsedSec: number; manaAddedThisLoop: number };
  /** Current mana pool — refilled to `initialMana` at each loop boundary. */
  mana: number;
  /** Current gold — zeroed at each loop boundary (vanilla idle-loops shape). */
  gold: number;
}

export interface LoopIntegrationResult {
  /** Loop's elapsed time in seconds at the loop end (or `breakPredicate` fire). */
  loopElapsedSec: number;
  /** Mana drained this loop. Equals total adjusted-ticks of completed actions plus any partial-completion drain. */
  manaConsumed: number;
  /** Mana granted this loop via reward effects (regular `add-mana`, basic `add-mana` / `exchange-gold-to-mana`). */
  manaAdded: number;
  /** Gold value at loop end (post-Trade if Trade fired). Engine's LoopLog `goldAccumulated` metric uses this shape. */
  goldAccumulated: number;
  /** Capability Level XP gained this loop (per cap id). Talent XP delta = entry × balance.talentAccrualRatio. */
  capabilityXpGains: Map<string, number>;
  /** ProgressVar XP gained this loop (per progressVar id). */
  progressVarXpGains: Map<string, number>;
  /** Per-action completion counts this loop. */
  completedActions: Array<{ actionId: string; loops: number }>;
  /**
   * `'queue-empty'` — plan exhausted under budget; `'mana-zero'` — mana
   * drained to 0 mid-plan; `'predicate'` — `breakPredicate` returned true
   * (used by `projectArc` for mid-loop predicate-fire detection).
   */
  endMode: 'queue-empty' | 'mana-zero' | 'predicate';
  /** Plan that drove this loop, post-Pass-7. */
  plan: PlannedItem[];
  /** Vectors snapshot at loop start (static-cost discipline). */
  vectors: ActionVector[];
}

// ─── Synthetic state helpers ─────────────────────────────────────────────

function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(xp, 1)) / 2);
}

/** Engine-canonical talent multiplier — `1 + sqrt(talentLevel) / 5`. */
function talentMultFromXp(talentXp: number): number {
  const level = levelFromXp(talentXp);
  return level <= 0 ? 1 : 1 + Math.sqrt(level) / 5;
}

/**
 * Seed a synthetic state representing the engine's fresh-boot condition:
 * all XP at 0, all action timesCompleted at 0, all regularVar pools at 0
 * (because progressVar levels = 0 → `level × perLevel` sums to 0), mana =
 * initialMana, gold = 0, loop count = 0. Pure data-driven — no engine
 * accessor needed because every value is the engine's documented baseline.
 */
export function createSyntheticInitialState(
  data: LooperData,
  tuning?: ResolvedLooperTunables,
): SyntheticLooperState {
  const capabilities = new Map<string, { levelXp: number; talentXp: number }>();
  for (const def of data.capabilities) {
    capabilities.set(def.id, { levelXp: 0, talentXp: 0 });
  }
  const progressVars = new Map<string, number>();
  for (const def of data.progressVars) {
    progressVars.set(def.id, 0);
  }
  const regularVars = new Map<string, { total: number; checked: number; good: number }>();
  for (const def of data.regularVars) {
    regularVars.set(def.id, { total: 0, checked: 0, good: 0 });
  }
  const actions = new Map<string, number>();
  for (const def of data.actions) {
    actions.set(def.id, 0);
  }
  return {
    capabilities,
    progressVars,
    regularVars,
    actions,
    loop: { count: 0, arcElapsedSec: 0, manaAddedThisLoop: 0 },
    mana: readTunable(tuning, 'balance/initialMana', data.balance.initialMana),
    gold: 0,
  };
}

/**
 * Recompute one regularVar's `total` from synthetic progressVar levels.
 * Mirrors `progress-vars.ts:recomputeRegularVarTotal`. Multi-axis: sums
 * `level × perLevel` across every progressVar whose `scales` table
 * contributes to this regularVar.
 */
function recomputeRegularVarTotal(
  state: SyntheticLooperState,
  regularVarId: string,
  progressVarDefs: ProgressVarDef[],
  tuning?: ResolvedLooperTunables,
): void {
  let total = 0;
  for (const def of progressVarDefs) {
    const scale = def.scales.find((s) => s.regularVarId === regularVarId);
    if (!scale) continue;
    const xp = state.progressVars.get(def.id) ?? 0;
    const perLevel = readTunable(
      tuning,
      `progressVars/${def.id}/scales/${regularVarId}/perLevel`,
      scale.perLevel,
    );
    total += levelFromXp(xp) * perLevel;
  }
  const rv = state.regularVars.get(regularVarId);
  if (rv) rv.total = total;
}

// ─── Per-completion engine mirror ────────────────────────────────────────

/**
 * Mirror of `actions.ts:tick`'s completion path. Invoked per completed
 * action within `integrateLoop`. Mutates synthetic state in place; returns
 * the mana grant produced by this completion (so the integrator can extend
 * its budget mid-loop).
 *
 * Engine ordering (preserved here):
 *   1. `timesCompleted += 1`
 *   2. Capability Level + Talent XP grants (canonical formula)
 *   3. Type-specific:
 *      - progress: progressVar XP grant; on level-up, recompute affected regularVars
 *      - regular: regularVars.checkOne; if `goodFound`, fire `rewardEffects`
 *      - basic: apply `completionEffects` in declaration order, with
 *        pre-batch gold snapshot for `exchange-gold-to-mana`
 */
function applyCompletion(
  state: SyntheticLooperState,
  def: ActionDef,
  vector: ActionVector,
  data: LooperData,
  deltas: {
    capabilityXpGains: Map<string, number>;
    progressVarXpGains: Map<string, number>;
    manaAdded: number;
  },
  tuning?: ResolvedLooperTunables,
): { manaGrantThisCompletion: number } {
  state.actions.set(def.id, (state.actions.get(def.id) ?? 0) + 1);

  // Capability XP grant — canonical formula (idle-loops-ng action-formulas.ts:48-61).
  const manaCost = readTunable(tuning, `actions/${def.id}/manaCost`, def.manaCost);
  const adjustedExp = Number(def.expMult) * (manaCost / vector.adjustedTicks);
  const talentAccrualRatio = readTunable(
    tuning,
    'balance/talentAccrualRatio',
    data.balance.talentAccrualRatio,
  );
  for (const [capId, weightSrc] of Object.entries(def.weights)) {
    const cap = state.capabilities.get(capId);
    if (!cap) continue;
    const talentMult = talentMultFromXp(cap.talentXp);
    const xpGain = Number(weightSrc) * adjustedExp * talentMult;
    cap.levelXp += xpGain;
    cap.talentXp += xpGain * talentAccrualRatio;
    deltas.capabilityXpGains.set(capId, (deltas.capabilityXpGains.get(capId) ?? 0) + xpGain);
  }

  let manaGrantThisCompletion = 0;

  if (def.type === 'progress') {
    const pvDef = data.progressVars.find((p) => p.id === def.progressVarId);
    if (pvDef) {
      const xpGrant = Number(pvDef.expMult) * adjustedExp;
      const before = state.progressVars.get(def.progressVarId) ?? 0;
      const after = before + xpGrant;
      state.progressVars.set(def.progressVarId, after);
      deltas.progressVarXpGains.set(
        def.progressVarId,
        (deltas.progressVarXpGains.get(def.progressVarId) ?? 0) + xpGrant,
      );
      const beforeLevel = levelFromXp(before);
      const afterLevel = levelFromXp(after);
      if (afterLevel > beforeLevel) {
        for (const scale of pvDef.scales) {
          recomputeRegularVarTotal(state, scale.regularVarId, data.progressVars, tuning);
        }
      }
    }
  } else if (def.type === 'regular') {
    const rv = state.regularVars.get(def.regularVarId);
    if (rv && rv.checked < rv.total) {
      rv.checked += 1;
      // Use the vector's snapshot rewardRatio (post-tunable) — same value
      // the planner used to decide loop allocation, so projector and
      // engine-truth converge under static-cost discipline.
      if (rv.checked % vector.rewardRatio === 0) {
        rv.good += 1;
        for (const reward of def.rewardEffects) {
          const amount = Number(reward.amount);
          if (reward.kind === 'add-mana') {
            state.mana += amount;
            manaGrantThisCompletion += amount;
          } else if (reward.kind === 'add-gold') {
            state.gold += amount;
          }
        }
      }
    }
  } else {
    // basic: apply completionEffects in order, with pre-batch gold snapshot
    // for exchange-gold-to-mana (mirrors actions.ts:applyCompletionEffects).
    const effects = def.completionEffects ?? [];
    if (effects.length > 0) {
      const preBatchGold = state.gold;
      for (const effect of effects) {
        if (effect.kind === 'add-mana') {
          const amt = Number(effect.amount);
          state.mana += amt;
          manaGrantThisCompletion += amt;
        } else if (effect.kind === 'add-gold') {
          state.gold += Number(effect.amount);
        } else if (effect.kind === 'spend-gold') {
          if (effect.amount === 'all') {
            state.gold = 0;
          } else {
            state.gold = Math.max(0, state.gold - Number(effect.amount));
          }
        } else if (effect.kind === 'exchange-gold-to-mana') {
          const mult = readTunable(tuning, `actions/${def.id}/exchangeMult`, def.exchangeMult ?? 0);
          const grant = preBatchGold * mult;
          state.mana += grant;
          manaGrantThisCompletion += grant;
        }
      }
    }
  }

  deltas.manaAdded += manaGrantThisCompletion;
  return { manaGrantThisCompletion };
}

// ─── Single-loop integrator ──────────────────────────────────────────────

/**
 * Walk a plan against synthetic state, completion by completion, applying
 * engine-canonical XP grants and reward effects. Mutates `state` in place;
 * the caller (`projectArc` or `projectBeatFireTime`) decides whether to
 * snapshot before invoking.
 *
 * Loop-end detection mirrors `loop.ts:113`: ends on `mana <= 0` OR plan
 * exhaustion (queue empties → `shouldRestart`). The optional
 * `breakPredicate` lets `projectArc` cut the loop short for mid-loop beat
 * predicates that fire on state crossings (e.g., `anyProgressVarLevelAtLeast`,
 * `manaAddedAtLeast`).
 *
 * The plan + vectors are passed in (not regenerated here) so the caller
 * can use either the engine's accessor (loop 1, when synthetic state =
 * fresh-boot) or a synthetic accessor (multi-loop, future projectArc).
 */
export function integrateLoop(
  state: SyntheticLooperState,
  params: PlannerParams,
  plan: PlannedItem[],
  vectors: ActionVector[],
  data: LooperData,
  options?: {
    breakPredicate?: (
      state: SyntheticLooperState,
      cumulative: { manaConsumed: number; manaAdded: number; loopElapsedSec: number },
    ) => boolean;
    tps?: number;
    tuning?: ResolvedLooperTunables;
  },
): LoopIntegrationResult {
  const tps = options?.tps ?? DEFAULT_TPS;
  const tuning = options?.tuning;
  void params; // params is the surface the plan was generated from; integrator reads only the plan.

  const vectorById = new Map<string, ActionVector>();
  for (const v of vectors) vectorById.set(v.def.id, v);

  const initialMana = readTunable(tuning, 'balance/initialMana', data.balance.initialMana);
  const startMana = state.mana;
  let manaConsumed = 0;
  let manaAdded = 0;
  const capabilityXpGains = new Map<string, number>();
  const progressVarXpGains = new Map<string, number>();
  const completedActions: Array<{ actionId: string; loops: number }> = [];
  let endMode: LoopIntegrationResult['endMode'] = 'queue-empty';

  const cumulative = () => ({
    manaConsumed,
    manaAdded,
    loopElapsedSec: manaConsumed / tps,
  });

  outer: for (const item of plan) {
    const v = vectorById.get(item.actionId);
    if (!v) continue;
    const def = v.def;
    let loopsCompleted = 0;
    for (let i = 0; i < item.loops; i++) {
      const remainingMana = startMana + manaAdded - manaConsumed;
      if (remainingMana < v.adjustedTicks) {
        // Completion would not fit — mana drains to zero mid-completion.
        // Account for the partial-tick drain so loopElapsedSec matches the
        // sim's real fire time (mana-zero events resolve in the same engine
        // tick as the drain — no detection lag).
        manaConsumed += Math.max(0, remainingMana);
        endMode = 'mana-zero';
        if (loopsCompleted > 0) {
          completedActions.push({ actionId: def.id, loops: loopsCompleted });
        }
        break outer;
      }
      manaConsumed += v.adjustedTicks;
      loopsCompleted += 1;
      const deltas = { capabilityXpGains, progressVarXpGains, manaAdded };
      applyCompletion(state, def, v, data, deltas, tuning);
      manaAdded = deltas.manaAdded;
      state.mana = startMana + manaAdded - manaConsumed;
      state.loop.manaAddedThisLoop = manaAdded;

      if (options?.breakPredicate && options.breakPredicate(state, cumulative())) {
        endMode = 'predicate';
        completedActions.push({ actionId: def.id, loops: loopsCompleted });
        break outer;
      }

      if (state.mana <= 0) {
        endMode = 'mana-zero';
        completedActions.push({ actionId: def.id, loops: loopsCompleted });
        break outer;
      }
    }
    // Inner loop completed without break — record completions and continue.
    if (loopsCompleted > 0) {
      completedActions.push({ actionId: def.id, loops: loopsCompleted });
    }
  }

  // Plan exhausted under budget — endMode stays 'queue-empty'.
  state.mana = startMana + manaAdded - manaConsumed;
  state.loop.manaAddedThisLoop = manaAdded;
  void initialMana;

  return {
    loopElapsedSec: manaConsumed / tps,
    manaConsumed,
    manaAdded,
    goldAccumulated: state.gold,
    capabilityXpGains,
    progressVarXpGains,
    completedActions,
    endMode,
    plan,
    vectors,
  };
}

// ─── Synthetic accessor (PlannerAccessor over synthetic state) ───────────

/**
 * Build a `PlannerAccessor` that reads from synthetic state instead of a
 * live engine. Used by `projectArc` to regenerate plans at each loop
 * boundary — the planner code (`generatePlan`, `projectActionVectors`,
 * `matchPrereq`) stays unchanged; only the accessor backend differs.
 *
 * Surface mirrors the engine modules' read API:
 * - `ActionsKey` → `getAll`, `getDef`, `getState` (computed adjustedTicks),
 *   `getTimesCompleted`
 * - `ProgressVarsKey` → `getAll`, `getDef`, `getSkill`, `getState`
 * - `RegularVarsKey` → `getState` (total + checked)
 * - `CapabilitiesKey` → `getAll`, `getState` (Level + Talent levels from XP)
 * - `InitialManaKey` → ref-shaped wrapper around `data.balance.initialMana`
 * - `LoopKey` → ref-shaped wrapper around `state.loop.count`
 * - `LooperDataKey` → the data itself (so the projector can re-read it)
 *
 * Read-only — modifying through the accessor is a no-op. Mutate via
 * `integrateLoop` (per-completion) or `applyLoopBoundary` (per-loop).
 */
export function createSyntheticAccessor(
  state: SyntheticLooperState,
  data: LooperData,
  tuning?: ResolvedLooperTunables,
): PlannerAccessor {
  const computeAdjustedTicks = (def: ActionDef): number => {
    const costDivisor = readTunable(tuning, 'balance/costDivisor', data.balance.costDivisor);
    const manaCost = readTunable(tuning, `actions/${def.id}/manaCost`, def.manaCost);
    let costMult = 0;
    for (const [capId, weightSrc] of Object.entries(def.weights)) {
      const cap = state.capabilities.get(capId);
      if (!cap) continue;
      const level = levelFromXp(cap.levelXp);
      const factor = 1 + level / costDivisor;
      costMult += Number(weightSrc) / factor;
    }
    return Math.max(1, Math.ceil(manaCost * costMult - 0.000001));
  };

  const actionsModule = {
    getAll: (): ActionDef[] => data.actions,
    getDef: (id: string): ActionDef | undefined => data.actions.find((d) => d.id === id),
    getState: (id: string) => {
      const def = data.actions.find((d) => d.id === id);
      if (!def) return undefined;
      const manaCost = readTunable(tuning, `actions/${def.id}/manaCost`, def.manaCost);
      const result: {
        adjustedTicks: { value: number };
        manaCost: { value: number };
        rewardRatio?: { value: number };
        exchangeMult?: { value: number };
      } = {
        adjustedTicks: { value: computeAdjustedTicks(def) },
        manaCost: { value: manaCost },
      };
      if (def.type === 'regular') {
        result.rewardRatio = {
          value: readTunable(tuning, `actions/${def.id}/rewardRatio`, def.rewardRatio),
        };
      }
      if (def.type === 'basic' && def.exchangeMult !== undefined) {
        result.exchangeMult = {
          value: readTunable(tuning, `actions/${def.id}/exchangeMult`, def.exchangeMult),
        };
      }
      return result;
    },
    getTimesCompleted: (id: string): number => state.actions.get(id) ?? 0,
  };

  const progressVarsModule = {
    getAll: (): Array<{ def: ProgressVarDef; state: { level: { level: { value: number } } } }> =>
      data.progressVars.map((def) => {
        const xp = state.progressVars.get(def.id) ?? 0;
        return { def, state: { level: { level: { value: levelFromXp(xp) } } } };
      }),
    getDef: (id: string): ProgressVarDef | undefined => data.progressVars.find((d) => d.id === id),
    getSkill: (id: string) => {
      const xp = state.progressVars.get(id) ?? 0;
      return { level: { value: levelFromXp(xp) }, xp: { value: xp } };
    },
    getState: (id: string) => {
      const xp = state.progressVars.get(id) ?? 0;
      return { level: { level: { value: levelFromXp(xp) } } };
    },
  };

  const regularVarsModule = {
    getAll: (): Array<{ def: RegularVarDef; total: { value: number } }> =>
      data.regularVars.map((def) => {
        const rv = state.regularVars.get(def.id);
        return { def, total: { value: rv?.total ?? 0 } };
      }),
    getState: (id: string) => {
      const rv = state.regularVars.get(id);
      if (!rv) return undefined;
      return { total: { value: rv.total }, checked: { value: rv.checked } };
    },
  };

  const capabilitiesModule = {
    getAll: (): Array<{
      def: CapabilityDef;
      state: { level: { level: { value: number } }; talent: { level: { value: number } } };
    }> =>
      data.capabilities.map((def) => {
        const cap = state.capabilities.get(def.id) ?? { levelXp: 0, talentXp: 0 };
        return {
          def,
          state: {
            level: { level: { value: levelFromXp(cap.levelXp) } },
            talent: { level: { value: levelFromXp(cap.talentXp) } },
          },
        };
      }),
    getState: (id: string) => {
      const cap = state.capabilities.get(id);
      if (!cap) return undefined;
      return {
        level: { level: { value: levelFromXp(cap.levelXp) } },
        talent: { level: { value: levelFromXp(cap.talentXp) } },
      };
    },
  };

  const initialManaRef = {
    value: readTunable(tuning, 'balance/initialMana', data.balance.initialMana),
  };
  const loopRef = { count: { value: state.loop.count } };

  // Symbol-keyed dispatch — an InjectionKey is a typed Symbol, so equality
  // works across generic instantiations without TS narrowing.
  const dispatch = new Map<symbol, unknown>([
    [ActionsKey as unknown as symbol, actionsModule],
    [ProgressVarsKey as unknown as symbol, progressVarsModule],
    [RegularVarsKey as unknown as symbol, regularVarsModule],
    [CapabilitiesKey as unknown as symbol, capabilitiesModule],
    [InitialManaKey as unknown as symbol, initialManaRef],
    [LoopKey as unknown as symbol, loopRef],
    [LooperDataKey as unknown as symbol, data],
  ]);

  return {
    tryInject<T>(key: InjectionKey<T>): T | undefined {
      // Refresh `loop.count` reactively — `loopRef` is stable but `count` is
      // re-read from synthetic state on each access.
      loopRef.count.value = state.loop.count;
      return dispatch.get(key as unknown as symbol) as T | undefined;
    },
  };
}

// ─── Loop-boundary retention/reset ───────────────────────────────────────

/**
 * Apply the engine's per-loop reset/retention against synthetic state.
 * Mirrors `looper/modules/loop.ts:99-156`:
 *
 * **Retained** (no-op here — already in state across loops): Talent XP,
 * action timesCompleted, progressVar XP, regularVar `total`.
 *
 * **Reset**:
 * - Capability Level XP → 0
 * - RegularVar `checked` / `good` → 0 (total persists)
 * - Mana → `initialMana`, manaAdded counter → 0
 * - Gold → 0
 * - Loop count incremented
 */
function applyLoopBoundary(
  state: SyntheticLooperState,
  data: LooperData,
  tuning?: ResolvedLooperTunables,
): void {
  for (const cap of state.capabilities.values()) {
    cap.levelXp = 0;
  }
  for (const rv of state.regularVars.values()) {
    rv.checked = 0;
    rv.good = 0;
  }
  state.mana = readTunable(tuning, 'balance/initialMana', data.balance.initialMana);
  state.gold = 0;
  state.loop.count += 1;
  state.loop.manaAddedThisLoop = 0;
}

// ─── Multi-loop arc projection ───────────────────────────────────────────

/**
 * A predicate over synthetic state — same semantic shape as
 * `ARC_BEATS[i].predicate`, against synthetic state instead of a live
 * engine. Predicate-side beat probes (step 3 of OL-757) provide these.
 */
export type ArcPredicate = (state: SyntheticLooperState) => boolean;

export interface ArcProjectionResult {
  /** Final synthetic state after the projection terminated. */
  state: SyntheticLooperState;
  /** Per-loop integration results, in order. */
  loops: LoopIntegrationResult[];
  /** Sum of `loopElapsedSec` across all loops projected. */
  totalElapsedSec: number;
  /** `'predicate'` — `breakPredicate` fired; `'max-loops'` — `maxLoops` reached without firing; `'no-progress'` — plan was empty. */
  endMode: 'predicate' | 'max-loops' | 'no-progress';
  /** Raw closed-form fire-time. Undefined unless `endMode === 'predicate'`. */
  fireSec?: number;
  /**
   * Detection lag in seconds — added to `fireSec` before `tickDelta`
   * granularity rounding to match the sim's reported time. Mid-loop fires
   * (e.g., a completing action grants XP that crosses a threshold) have
   * lag = 0; loop-boundary fires (e.g., `loopCountAtLeast(1)`) on
   * queue-empty have lag = 1/tps.
   */
  fireLagSec?: number;
}

/**
 * Walk the arc loop-by-loop until `breakPredicate` fires, `maxLoops` is
 * exhausted, or no progress can be made (empty plan). Mutates the
 * synthetic state in place; returns the final state plus per-loop
 * telemetry.
 *
 * Predicate is checked twice per iteration:
 * 1. After each completion within `integrateLoop` — mid-loop fires (e.g.,
 *    progressVar level-up) get 0 lag.
 * 2. After loop boundary (post-reset, post-`loop.count++`) — boundary
 *    fires (e.g., `loopCountAtLeast(N)`) inherit the loop's endMode lag.
 */
export function projectArc(
  data: LooperData,
  params: PlannerParams = DEFAULT_PARAMS,
  options?: {
    breakPredicate?: ArcPredicate;
    maxLoops?: number;
    tps?: number;
    initialState?: SyntheticLooperState;
    tuning?: ResolvedLooperTunables;
    /**
     * Plan generator override. Discovery seam for fork-characterization
     * scripts (OL-768 (γ) chunked-Pass-5 variant). Default: `generatePlan`.
     */
    planFn?: (accessor: PlannerAccessor, params: PlannerParams) => PlannedItem[];
  },
): ArcProjectionResult {
  const tps = options?.tps ?? DEFAULT_TPS;
  const maxLoops = options?.maxLoops ?? 100;
  const tuning = options?.tuning;
  const planFn = options?.planFn ?? generatePlan;
  const state = options?.initialState ?? createSyntheticInitialState(data, tuning);
  const loops: LoopIntegrationResult[] = [];
  let totalElapsedSec = 0;

  // Initial predicate check — some predicates (e.g., `loopCountAtLeast(0)`)
  // could be true at boot. Belt-and-suspenders.
  if (options?.breakPredicate?.(state)) {
    return {
      state,
      loops,
      totalElapsedSec: 0,
      endMode: 'predicate',
      fireSec: 0,
      fireLagSec: 0,
    };
  }

  for (let i = 0; i < maxLoops; i++) {
    const accessor = createSyntheticAccessor(state, data, tuning);
    const plan = planFn(accessor, params);
    const vectors = projectActionVectors(accessor);

    if (plan.length === 0) {
      return { state, loops, totalElapsedSec, endMode: 'no-progress' };
    }

    const result = integrateLoop(state, params, plan, vectors, data, {
      tps,
      tuning,
      breakPredicate: options?.breakPredicate ? (s) => options.breakPredicate!(s) : undefined,
    });
    loops.push(result);

    if (result.endMode === 'predicate') {
      // Mid-loop predicate fire — 0 lag (state crossing observed in-tick).
      const fireSec = totalElapsedSec + result.loopElapsedSec;
      return {
        state,
        loops,
        totalElapsedSec: fireSec,
        endMode: 'predicate',
        fireSec,
        fireLagSec: 0,
      };
    }

    totalElapsedSec += result.loopElapsedSec;
    state.loop.arcElapsedSec = totalElapsedSec;

    // Apply loop boundary — retention preserved (Talent, timesCompleted,
    // progressVar XP, regularVar total) by virtue of staying in state;
    // reset zeros Level XP, regularVar checked/good, mana, gold; increments
    // loop.count.
    const endedQueueEmpty = result.endMode === 'queue-empty';
    applyLoopBoundary(state, data, tuning);

    // Boundary predicate check — fire-time inherits loop's detection lag.
    if (options?.breakPredicate && options.breakPredicate(state)) {
      return {
        state,
        loops,
        totalElapsedSec,
        endMode: 'predicate',
        fireSec: totalElapsedSec,
        fireLagSec: endedQueueEmpty ? 1 / tps : 0,
      };
    }
  }

  return { state, loops, totalElapsedSec, endMode: 'max-loops' };
}

/**
 * Convert an arc projection's raw fire time to the value `runUntil(tickDelta)`
 * would report — combines the projection's own lag (mid-loop = 0,
 * queue-empty boundary = 1/tps) with `runUntil`'s predicate-check
 * granularity ceiling.
 */
export function arcSimulatedFireSeconds(arc: ArcProjectionResult, tickDelta: number): number {
  if (arc.fireSec === undefined) return Infinity;
  const real = arc.fireSec + (arc.fireLagSec ?? 0);
  return Math.ceil(real / tickDelta) * tickDelta;
}

// ─── Beat-2 projection (preserved API) ───────────────────────────────────

export interface BeatFireProjection {
  beatId: string;
  /** Projected fire time in seconds. `Infinity` only if neither mana nor queue can drain (no plan, no budget). */
  seconds: number;
  /** Diagnostic breakdown for sim-vs-projection comparison. */
  breakdown: {
    initialMana: number;
    planLength: number;
    planTotalCost: number;
    projectedManaAdded: number;
    consumedAtFire: number;
    executedItems: number;
    /** `null` = no partial item; otherwise the loop-count of the last (partially-executed) item. */
    partialTailLoops: number | null;
    /**
     * Loop-end mode: `'queue-empty'` (plan exhausts under budget — `shouldRestart`
     * fires) or `'mana-zero'` (mana drains to 0 mid-plan).
     */
    endMode: 'queue-empty' | 'mana-zero' | 'unreached';
  };
}

/**
 * Project beat-2 (first loop ends) fire time by running `integrateLoop`
 * once against a fresh synthetic state seeded from the engine's data.
 *
 * Loop end fires on EITHER `mana <= 0` OR `shouldRestart` — the queue sets
 * `shouldRestart` when its plan exhausts (`looper/modules/loop.ts:113`).
 */
export function projectBeatFireTime(
  engine: PlannerAccessor,
  params: PlannerParams = DEFAULT_PARAMS,
  beatId: 'beat-2' = 'beat-2',
  tps: number = DEFAULT_TPS,
): BeatFireProjection {
  const plan = generatePlan(engine, params);
  const vectors = projectActionVectors(engine);

  const data = engine.tryInject(LooperDataKey);
  const initialManaRef = engine.tryInject(InitialManaKey);
  const initialMana = Number(initialManaRef?.value ?? data?.balance.initialMana ?? 0);

  if (!data) {
    return {
      beatId,
      seconds: Infinity,
      breakdown: {
        initialMana,
        planLength: plan.length,
        planTotalCost: 0,
        projectedManaAdded: 0,
        consumedAtFire: 0,
        executedItems: 0,
        partialTailLoops: null,
        endMode: 'unreached',
      },
    };
  }

  const planTotalCost = plan.reduce((sum, item) => {
    const v = vectors.find((vec) => vec.def.id === item.actionId);
    return sum + (v ? v.adjustedTicks * item.loops : 0);
  }, 0);

  const state = createSyntheticInitialState(data);
  const result = integrateLoop(state, params, plan, vectors, data, { tps });

  // Adapt LoopIntegrationResult into BeatFireProjection.breakdown.
  // executedItems = number of plan items with at least one completion.
  const executedItems = result.completedActions.length;
  // partialTailLoops: null unless the final item didn't complete all its loops.
  let partialTailLoops: number | null = null;
  const lastCompletion = result.completedActions[result.completedActions.length - 1];
  const lastPlanItem = plan[plan.length - 1];
  if (
    result.endMode === 'mana-zero' &&
    lastCompletion &&
    lastPlanItem &&
    lastCompletion.actionId === lastPlanItem.actionId &&
    lastCompletion.loops < lastPlanItem.loops
  ) {
    partialTailLoops = lastCompletion.loops;
  }

  const seconds = result.manaConsumed > 0 ? result.manaConsumed / tps : Infinity;

  return {
    beatId,
    seconds,
    breakdown: {
      initialMana,
      planLength: plan.length,
      planTotalCost,
      projectedManaAdded: result.manaAdded,
      consumedAtFire: result.manaConsumed,
      executedItems,
      partialTailLoops,
      endMode: result.endMode === 'predicate' ? 'unreached' : result.endMode,
    },
  };
}

/**
 * Convert a projection's raw fire time to the value `runUntil(tickDelta)`
 * would report. Two corrections compose:
 *
 *   - **Engine detection lag.** Queue-empty mode incurs a 1-engine-tick lag
 *     between the last action completing (cursor advance) and `shouldRestart`
 *     surfacing in `endCondition`. Mana-zero mode is processed in the same
 *     engine tick as the drain, so no lag. (Validated against beat-2 sketch:
 *     raw=11.00s, sim at tickDelta=0.05s reports 11.05s, exactly 1/tps.)
 *   - **Predicate-check granularity.** `runUntil` checks the predicate after
 *     each `simulateTick(tickDelta)`, so any event in `(N·tickDelta,
 *     (N+1)·tickDelta]` reports as `(N+1)·tickDelta`. Mathematical ceiling.
 */
export function simulatedFireSeconds(
  projection: BeatFireProjection,
  tickDelta: number,
  tps: number = DEFAULT_TPS,
): number {
  if (!isFinite(projection.seconds)) return Infinity;
  const lag = projection.breakdown.endMode === 'queue-empty' ? 1 / tps : 0;
  const real = projection.seconds + lag;
  return Math.ceil(real / tickDelta) * tickDelta;
}

// ─── Synthetic-state beat predicates (mirror of beats.ts ARC_BEATS) ──────

/**
 * Beat-id → synthetic-state predicate. Same fire-time semantics as
 * `beats.ts:ARC_BEATS`, evaluated against `SyntheticLooperState` instead of
 * a live engine. `createBeatPredicates(data)` closes over content-derived
 * sets (e.g., wilds-zone action ids, initialMana baseline) so per-call
 * evaluation is O(1)–O(C) where C is the relevant cap/progressVar count.
 *
 * Fire-time accuracy varies by beat:
 *
 * - **Beats 2–8** — fire on completion-grant or loop-boundary events the
 *   integrator emits at engine-truth granularity. EXACT match against sim
 *   expected.
 * - **Beat-1** (`queueTickingAndManaDrained`) — fires within the first
 *   tick of the first action in sim, but the projector observes only at
 *   completion boundaries (per-completion granularity). Predicted fire
 *   time = first completion's elapsed; sim reports first tickDelta after
 *   loop start. Structural drift bounded by `firstCompletionDuration`;
 *   accept and document at validation time. Beat-1 is verify-only per
 *   `beats.ts` § "BEAT_WINDOWS" annotation.
 */
export type SyntheticBeatPredicates = Record<string, ArcPredicate>;

export function createBeatPredicates(
  data: LooperData,
  tuning?: ResolvedLooperTunables,
): SyntheticBeatPredicates {
  const initialMana = readTunable(tuning, 'balance/initialMana', data.balance.initialMana);
  const actionsById = new Map(data.actions.map((d) => [d.id, d]));
  const actionsByZone = new Map<string, Set<string>>();
  for (const def of data.actions) {
    const set = actionsByZone.get(def.zoneId) ?? new Set<string>();
    set.add(def.id);
    actionsByZone.set(def.zoneId, set);
  }
  void actionsById;

  const loopCountAtLeast =
    (n: number): ArcPredicate =>
    (s) =>
      s.loop.count >= n;

  const manaAddedAtLeast =
    (n: number): ArcPredicate =>
    (s) =>
      s.loop.manaAddedThisLoop >= n;

  const actionCompletedAtLeast =
    (id: string, n: number): ArcPredicate =>
    (s) =>
      (s.actions.get(id) ?? 0) >= n;

  const anyCapabilityTalentAtLeast =
    (n: number): ArcPredicate =>
    (s) => {
      for (const cap of s.capabilities.values()) {
        if (levelFromXp(cap.talentXp) >= n) return true;
      }
      return false;
    };

  const anyProgressVarLevelAtLeast =
    (n: number): ArcPredicate =>
    (s) => {
      for (const xp of s.progressVars.values()) {
        if (levelFromXp(xp) >= n) return true;
      }
      return false;
    };

  const anyActionInZoneCompleted =
    (zoneId: string, n: number): ArcPredicate =>
    (s) => {
      const ids = actionsByZone.get(zoneId);
      if (!ids) return false;
      for (const id of ids) {
        if ((s.actions.get(id) ?? 0) >= n) return true;
      }
      return false;
    };

  const averageTalentMultiplierAtLeast =
    (threshold: number): ArcPredicate =>
    (s) => {
      let sum = 0;
      let count = 0;
      for (const cap of s.capabilities.values()) {
        sum += talentMultFromXp(cap.talentXp);
        count++;
      }
      return count > 0 && sum / count > threshold;
    };

  // Beat-1: "queue ticks AND mana drained below initial". Per-completion
  // granularity drops the within-completion crossing — we observe at
  // completion-end. Predicate true on first completion (mana drops by
  // `adjustedTicks`, both conditions become true at the boundary).
  const queueTickingAndManaDrained: ArcPredicate = (s) => s.mana < initialMana;

  return {
    'beat-1': queueTickingAndManaDrained,
    'beat-2': loopCountAtLeast(1),
    'beat-3': anyProgressVarLevelAtLeast(1),
    'beat-4': manaAddedAtLeast(1),
    'beat-5': actionCompletedAtLeast('trade', 1),
    'beat-6': (s) => anyCapabilityTalentAtLeast(1)(s) && loopCountAtLeast(2)(s),
    'beat-7': anyActionInZoneCompleted('wilds', 1),
    'beat-8': (s) =>
      loopCountAtLeast(5)(s) &&
      averageTalentMultiplierAtLeast(1.05)(s) &&
      anyActionInZoneCompleted('wilds', 1)(s),
  };
}
