/**
 * Looper plan generator — whole-item queue planner.
 *
 * Pure logic. Reads live engine state, produces a plan as
 * `Array<{actionId, loops}>`. The bot module (`bot.ts`) consumes the plan
 * and reconciles it onto the queue on `loop.afterRestart` (additive — the
 * queue persists across loops; reconcileQueue tweaks it rather than
 * rebuilding).
 *
 * # Principles
 *
 * 1. **Mana gen is the priority.** A single unified harvest pass ranks
 *    every mana-bearing whole-item — direct (regular→add-mana) and gold-
 *    routed (regular→add-gold + trade closer) — by per-tick mana-
 *    equivalent EV. Cracking the manapot is the loop's primary work;
 *    progression supports it; trainers are strategic.
 *
 * 2. **Trainers are strategic, not bootstrap.** Capability-training
 *    basics (`expMult ≥ 4`) are specialized runs the player chooses
 *    deliberately — for specific stat building toward future progress, or
 *    as late-arc boosters when the first zone is nearly maxed. Canonical
 *    idle-loops shape: trainers cost MORE than multiple explores, making
 *    them an expensive opt-in choice, not a default. Default plans
 *    contain zero trainers; strategies opt in via `talentOverflowThreshold > 0`.
 *
 * 3. **No loop is standalone.** Bootstrap is a multi-loop arc, not a
 *    per-loop self-sufficient unit. Early loops grow `cache.total` past
 *    `rewardRatio` via roam/acquaint progression; mid loops drain budget
 *    on initially-zero-yield explores to bank the lifetime-`checked`
 *    crossing that fires the first good; later loops cash in goodTemp
 *    cheaply, freeing budget for more progression. The flywheel builds
 *    over many loops. The planner doesn't model the multi-loop arc
 *    explicitly — correct priority ordering plus per-source whole-item
 *    emission produce the right per-loop plan, and lifetime engine state
 *    evolves the bootstrap naturally across loops.
 *
 * 4. **Tunable values match design reality.** When budget tunables
 *    (`balance/initialMana`, `manaUpOversupplyFactor`) drift to
 *    compensate for planner correctness gaps, the planner is the bug —
 *    not the tunable. Fix the planner; restore the canonical baseline.
 *
 * # Whole-item emission
 *
 * Each pool source emits AT MOST two queue items per loop:
 *   - one `{actionId, loops: knownGoodCount}` for the cash-in portion
 *   - one `{actionId, loops: poolCapacity}` for the explore portion
 *
 * Chain integrity is delegated entirely to the engine. The queue
 * dispatches per-completion (`actions.tick` advances one completion at a
 * time within an item; `regular-vars.ts:checkOne` consumes goodTemp first,
 * then explores, accumulating `lifetimeChecked`). The planner does not
 * model atom chains; the engine's per-completion semantics naturally fire
 * rewards on `(lifetimeChecked + k) % R === 0` boundaries inside the
 * `{crack: N}` item.
 *
 * Trim shrinks the tail item's `loops` rather than popping atoms. A
 * `{crack: 10}` item facing a budget shortfall becomes `{crack: 5}` — the
 * productive prefix survives without the planner needing to know which
 * atoms fire rewards. Reward projection during trim uses closed-form
 * `floor((lifetimeChecked + loops) / R) - floor(lifetimeChecked / R)`.
 *
 * # Static-cost (Option A) vs iterative-cost (Option B)
 *
 * This first cut uses static cost: `adjustedTicks` read once at plan-build
 * time, applied uniformly to all loops of the action. Real cost decreases
 * mid-plan as capability levels rise from XP grants — actions late in the
 * plan execute cheaper than budgeted. Static-cost is conservative
 * (feasibility-guaranteed: real costs only go down) and produces a
 * predictable budget. Iterative-cost would walk the plan once forward,
 * accumulating per-step XP gain into a projected level, and recompute
 * adjustedTicks per step — closer to dmchurch's predictor shape. Upgrade
 * to (B) is single-file, ~20 lines; the trigger is the solver finding
 * it can't tune to a beat window because static budgeting is too slack.
 *
 * # Plan passes
 *
 * Emission order = execution order = trim-survivability order. Pass-3
 * tail-shrink trim reduces worst-EV items first by virtue of plan being
 * built best-first.
 *
 *   1. **Unified mana harvest** — single priority class, two chain forms:
 *      - **Direct**: regular actions emitting `add-mana` (e.g. `crack`).
 *        Two candidates per source — known-good (`goodTemp` cash-in) and
 *        explore (`poolCapacity` cracking). Plus basic-type one-shot mana
 *        grants (completion-effect emitters).
 *      - **Gold-routed**: regular actions emitting `add-gold` (e.g.
 *        `run`, `slip`) followed by a `trade` whole-item that converts
 *        via `exchange-gold-to-mana`. PolicyB cost-of-trade gate: emit
 *        the chain iff `chainGoldProjected × exchangeMult >
 *        tradeAdjustedTicks` (breakeven `tradeAdjTicks / exchangeMult`).
 *        Trade is the closing step of the gold chain, not a banking gate
 *        — strictly dominates a `tradeThreshold` knob (same outcome
 *        EV-positive, better EV-negative, no false positives).
 *
 *      All candidates rank by per-tick mana-equivalent EV; emit
 *      best-first. Gold-routed chains share a single trade closer
 *      (subsequent gold-routed candidates ride the already-emitted
 *      trade; their gold projection accumulates into one settlement).
 *
 *   2. **Progression** — progress-type actions targeting visible
 *      progressVars admitted by `progressionTarget[pvId] > 0`. Each
 *      admitted progressVar emits one `{progress, loops:
 *      floor(progressionChunkTicks / pvAdjustedTicks)}` item per loop.
 *      Budget-shaped (not target-shaped): cross-loop XP accumulates
 *      naturally, no closed-form `xpToReachLevel` math.
 *
 *   3. **Budget trim** — shrinks the tail item's `loops` until total cost
 *      fits `initialMana × manaUpOversupplyFactor + projectedManaAdded`,
 *      removing items only when their `loops` reaches 0. Reward-projection
 *      drops as `loops` shrinks past R-boundaries; budget cap is computed
 *      once at the start of trim and held fixed (over-keeps slightly when
 *      reward-firing items get trimmed but their projection contribution
 *      doesn't unwind — acceptable conservatism).
 *
 *   4. **Strategic trainers** *(opt-in, `talentOverflowThreshold > 0`)* —
 *      after trim, if remaining headroom exceeds the threshold, append
 *      rotating capability-trainer iterations (`expMult ≥ 4` basics)
 *      until consumed. Default `0` = disabled (trainers absent from
 *      every plan). Engaged by `farm-talent` to soak mana-rich loops
 *      into compounded talent gain.
 *
 * Productive-zero actions (regular pools where `poolCapacity = 0` AND
 * `knownGoodCount = 0`, progress actions whose target is at level cap)
 * are excluded at vector-build time.
 *
 * # Budget feasibility
 *
 * Total plan cost (`Σ adjustedTicks × loops`) must fit
 * `initialMana × manaUpOversupplyFactor + projectedManaAdded`. The default
 * `oversupplyFactor = 1.0` is the tight budget; reward grants from regular
 * actions extend the cap by their projected mana-add (rewards fired ×
 * rewardAmount), so plans can exceed `initialMana` when the loop's own
 * cracks fund the overflow.
 */

import { Decimal, type InjectionKey } from 'open-loop-engine';
import {
  ActionsKey,
  CapabilitiesKey,
  InitialManaKey,
  LoopKey,
  ProgressVarsKey,
  RegularVarsKey,
} from '../modules';
import type { ActionDef, ActionPrereq, CompletionEffect, RewardEffect } from '../data/types';

/**
 * Minimal accessor the planner needs — both `Engine` and `EngineContext`
 * satisfy this. Lets the planner be called from inside `install(ctx)` (using
 * the install-time context) AND from outside (using the started engine —
 * solver, sim probes, balance workbench).
 */
export interface PlannerAccessor {
  tryInject<T>(key: InjectionKey<T>): T | undefined;
}

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Planner inputs the solver perturbs via `pushScope('bot/params/...')` and
 * the canonical baseline reads from `DEFAULT_PARAMS`. Persistent (lives
 * inside the bot module's `withPersistentContext` namespace) so importSave
 * round-trips them alongside game state.
 */
export interface PlannerParams {
  /**
   * Per-progressVar level-delta weighting. Strategies differ on this axis
   * only — `progressionTarget[pvId] > 0` admits the progressVar to the
   * progression pass; `0` skips it. Default applied at plan time: `+1`
   * for every visible progressVar with a visible progress-action.
   *
   * The numeric weight does not scale chunk size (chunks are budget-
   * shaped via `progressionChunkTicks`); it gates inclusion only.
   */
  progressionTarget: Record<string, number>;
  /**
   * Multiplier applied to `initialMana` when computing the budget cap.
   * `1.0` = tight budget (planned cost = pool); `>1.0` adds slack to
   * absorb cost-reduction underutilization. Defaults to `1.0` per the
   * static-cost (Option A) discipline.
   */
  manaUpOversupplyFactor: number;
  /**
   * Per-progressVar tick budget for the progression pass. Each visible
   * progress-action with `progressionTarget[pvId] > 0` emits one
   * `{progress, loops: floor(chunkTicks / pvAdjustedTicks)}` item per
   * loop. Budget-shaped (not target-shaped): targets accumulate across
   * loops via lifetime XP rather than being closed-form solved per loop.
   *
   * Default `200` produces 1 acquaint/roam (pvAdjTicks=150) per loop at
   * canonical content; trail/mark (250/280) get 0 chunks until late-arc
   * cost reduction. Scales naturally as capability levels reduce
   * pvAdjTicks across the arc.
   */
  progressionChunkTicks: number;
  /**
   * When `> 0`, after Pass 3 (budget trim) the planner runs Pass 4 (talent
   * overflow): if remaining headroom in the budget cap exceeds this
   * threshold, the planner appends rotating capability-trainer iterations
   * (basic actions classified `'capability'` with `expMult ≥ 4` — the
   * canonical idle-loops training-multiplier signature) until the budget
   * is consumed. Drives `farm-talent`'s "swap to talent-soak when mana is
   * plentiful" mode without growing the override surface beyond
   * `PlannerParams`. Default `0` = disabled (other strategies leave it off).
   */
  talentOverflowThreshold: number;
}

/** A planned plan-segment item — `{actionId, loops}` ordered for queue write. */
export interface PlannedItem {
  actionId: string;
  loops: number;
}

/**
 * Closed-form action projection. Built once per plan-build pass; the plan
 * generator reads from this snapshot, never from live refs. Captures the
 * per-completion arithmetic the planner needs without exposing the
 * underlying ActionDef discriminated union to the planning logic.
 */
export interface ActionVector {
  def: ActionDef;
  /** Current adjusted ticks-to-complete at present capability levels (static). */
  adjustedTicks: number;
  /** Predicted XP gained per completion on the action's progressVar (progress-type only). */
  progressVarXpPerCompletion: number;
  /** Projected per-completion direct mana grant (regular: averaged across rewardRatio cycle; basic: completion effect amount). */
  manaPerCompletion: number;
  /** Projected per-completion direct gold grant (regular: averaged; basic: completion effect amount). */
  goldPerCompletion: number;
  /** Unchecked-pool capacity in completions before exhaustion (regular-type only; equals `total - checked`). */
  poolCapacity: number;
  /**
   * Lifetime `checked` count for the action's regularVar (regular-type
   * only). Persistent across loops post-OL-778; drives cross-loop reward-
   * boundary alignment via `r_dist = R - (lifetimeChecked mod R)`. Sub-
   * cycle exploration is productive long-term because each crack
   * contributes to the next boundary crossing across loops.
   */
  lifetimeChecked: number;
  /**
   * Known-goods available at plan time (regular-type only; equals
   * `goodTemp` post-loop-restart). Each known-good fires one reward on
   * a single `checkOne` call without consuming pool capacity.
   */
  knownGoodCount: number;
  /** rewardRatio (regular-type only) — required loop granularity to fire any reward. */
  rewardRatio: number;
  /** True iff the action's prereqs all match against current state. */
  visible: boolean;
  /**
   * "Productive" — for regular actions, true iff any forward progress is
   * possible: `poolCapacity > 0` (lifetime `checked` accumulates across
   * loops, so even sub-cycle exploration is productive long-term) or
   * `knownGoodCount > 0` (cheap reward consumption). Non-regular: true iff
   * visible. Productive-zero actions stay in the vector list but the
   * planner skips them in passes 2 + 3.
   */
  productive: boolean;
  /** Fast-classifier for plan-pass dispatch. */
  passSegment: 'capability' | 'gold' | 'mana' | 'trade' | 'progression' | 'skip';
}

// ─── Defaults ─────────────────────────────────────────────────────────────

export const DEFAULT_PARAMS: PlannerParams = {
  progressionTarget: {},
  manaUpOversupplyFactor: 1.0,
  progressionChunkTicks: 250,
  talentOverflowThreshold: 0,
};

// ─── Visibility (mirrors queue.ts's stateView shape) ──────────────────────

function matchPrereq(engine: PlannerAccessor, prereq: ActionPrereq): boolean {
  switch (prereq.kind) {
    case 'always':
      return true;
    case 'action-completion-count': {
      const actions = engine.tryInject(ActionsKey);
      return actions ? actions.getTimesCompleted(prereq.actionId) >= prereq.value : false;
    }
    case 'capability-tier-level': {
      const capabilities = engine.tryInject(CapabilitiesKey);
      const state = capabilities?.getState(prereq.capabilityId);
      if (!state) return false;
      const level = prereq.tier === 'level' ? state.level.level.value : state.talent.level.value;
      return Decimal.gte(level, prereq.value);
    }
    case 'progress-var-level': {
      const progressVars = engine.tryInject(ProgressVarsKey);
      const skill = progressVars?.getSkill(prereq.progressVarId);
      return skill ? Decimal.gte(skill.level.value, prereq.value) : false;
    }
    case 'loop-count': {
      const loop = engine.tryInject(LoopKey);
      return loop ? loop.count.value >= prereq.value : false;
    }
  }
}

function isVisible(engine: PlannerAccessor, def: ActionDef): boolean {
  if (!def.prereqs || def.prereqs.length === 0) return true;
  return def.prereqs.every((p) => matchPrereq(engine, p));
}

// ─── Per-action grant projection ──────────────────────────────────────────

function rewardEffectAmount(effects: RewardEffect[], kind: RewardEffect['kind']): number {
  for (const effect of effects) {
    if (effect.kind === kind) return Number(effect.amount);
  }
  return 0;
}

function completionEffectAmount(
  effects: CompletionEffect[] | undefined,
  kind: 'add-mana' | 'add-gold' | 'spend-gold',
): number {
  if (!effects) return 0;
  for (const effect of effects) {
    if (effect.kind !== kind) continue;
    // 'spend-gold' allows 'all' — treat as 0 for grant-projection (it's a
    // negative effect, not a grant). The exchange-gold-to-mana variant is
    // gold-context-dependent and projected separately at trade time, so
    // it's intentionally excluded from this helper's `kind` arg.
    const amt = effect.amount;
    return typeof amt === 'number' ? amt : 0;
  }
  return 0;
}

function classifyPassSegment(def: ActionDef): ActionVector['passSegment'] {
  if (def.type === 'progress') return 'progression';
  if (def.type === 'regular') {
    const grantsMana = def.rewardEffects.some((e) => e.kind === 'add-mana');
    if (grantsMana) return 'mana';
    const grantsGold = def.rewardEffects.some((e) => e.kind === 'add-gold');
    if (grantsGold) return 'gold';
    return 'skip';
  }
  // basic
  const hasExchange = def.completionEffects?.some((e) => e.kind === 'exchange-gold-to-mana');
  if (hasExchange) return 'trade';
  const hasReward = def.completionEffects?.some(
    (e) => e.kind === 'add-mana' || e.kind === 'add-gold',
  );
  if (hasReward) return 'mana'; // basic-type mana grant slots into pass 3
  return 'capability';
}

// ─── Vector projector ─────────────────────────────────────────────────────

export function projectActionVectors(engine: PlannerAccessor): ActionVector[] {
  const actions = engine.tryInject(ActionsKey);
  const progressVars = engine.tryInject(ProgressVarsKey);
  const regularVars = engine.tryInject(RegularVarsKey);
  if (!actions || !progressVars || !regularVars) return [];

  const vectors: ActionVector[] = [];
  for (const def of actions.getAll()) {
    const state = actions.getState(def.id);
    if (!state) continue;

    const adjustedTicks = Math.max(1, Number(state.adjustedTicks.value));

    let progressVarXpPerCompletion = 0;
    let manaPerCompletion = 0;
    let goldPerCompletion = 0;
    let poolCapacity = 0;
    let lifetimeChecked = 0;
    let knownGoodCount = 0;
    let rewardRatio = 0;

    if (def.type === 'progress') {
      const pvDef = progressVars.getDef(def.progressVarId);
      if (pvDef) {
        // Mirror modules/actions.ts grant: progressAmount × pvDef.expMult.
        progressVarXpPerCompletion = Number(Decimal.mul(def.progressAmount, pvDef.expMult));
      }
    } else if (def.type === 'regular') {
      rewardRatio = Number(state.rewardRatio?.value ?? def.rewardRatio);
      const rvState = regularVars.getState(def.regularVarId) as
        | {
            total: { value: number };
            checked: { value: number };
            goodTemp?: { value: number };
          }
        | undefined;
      if (rvState) {
        const total = Number(rvState.total.value);
        const checked = Number(rvState.checked.value);
        lifetimeChecked = checked;
        poolCapacity = Math.max(0, total - checked);
        // `goodTemp` is the post-restart known-good count. Old engine
        // builds without the field default to 0 — same as a fresh pool.
        knownGoodCount = Math.max(0, Number(rvState.goodTemp?.value ?? 0));
      }
      // Average per-completion grant: rewardAmount fires every Nth completion.
      const manaReward = rewardEffectAmount(def.rewardEffects, 'add-mana');
      const goldReward = rewardEffectAmount(def.rewardEffects, 'add-gold');
      if (rewardRatio > 0) {
        manaPerCompletion = manaReward / rewardRatio;
        goldPerCompletion = goldReward / rewardRatio;
      }
    } else {
      // basic — completion effects fire on every completion (no rewardRatio).
      manaPerCompletion = completionEffectAmount(def.completionEffects, 'add-mana');
      goldPerCompletion = completionEffectAmount(def.completionEffects, 'add-gold');
    }

    const visible = isVisible(engine, def);

    // Productive: regular actions are productive when ANY forward progress
    // is possible — either an unchecked pool to crack into (lifetime
    // `checked` accumulates across loops post-OL-778, so even sub-cycle
    // exploration is productive long-term) or known-goods queued for
    // cheap consumption. Non-regular: productive iff visible.
    const productive =
      visible &&
      (def.type !== 'regular' || (rewardRatio > 0 && (poolCapacity > 0 || knownGoodCount > 0)));

    vectors.push({
      def,
      adjustedTicks,
      progressVarXpPerCompletion,
      manaPerCompletion,
      goldPerCompletion,
      poolCapacity,
      lifetimeChecked,
      knownGoodCount,
      rewardRatio,
      visible,
      productive,
      passSegment: classifyPassSegment(def),
    });
  }
  return vectors;
}

// ─── Plan generator ───────────────────────────────────────────────────────

/**
 * Per-item metadata used by Pass-6 trim to recompute mana projection when
 * shrinking an item's loop count. Parallel to `PlanState.plan`; the public
 * `PlannedItem[]` strips this before returning.
 *
 * `kind` discriminates how `loops`-changes affect projected mana/gold:
 *   - `known-good-mana` / `known-good-gold` — every loop fires a full
 *     reward; reducing loops by 1 drops one rewardAmount.
 *   - `explore-mana` / `explore-gold` — rewards fire when
 *     `(lifetimeCheckedAtItemStart + k) % R === 0`; reducing loops drops a
 *     reward only when the dropped completion was on an R-boundary.
 *   - `progression` / `trainer` — no reward; trim only shrinks cost.
 *   - `basic-mana` — completion-effect grant per loop (one-shot mana).
 *   - `trade` — a single emission; trim treats as cost-only.
 */
interface PlanItemMeta {
  kind:
    | 'known-good-mana'
    | 'explore-mana'
    | 'known-good-gold'
    | 'explore-gold'
    | 'progression'
    | 'trade'
    | 'trainer'
    | 'basic-mana';
  vector: ActionVector;
  /** For explore-* kinds: lifetime `checked` snapshot at item start. */
  lifetimeCheckedAtItemStart: number;
}

interface PlanState {
  plan: PlannedItem[];
  /** Parallel array — `meta[i]` describes `plan[i]`. */
  meta: PlanItemMeta[];
  /** Mutable estimate of mana we expect to add over the loop. */
  projectedManaAdded: number;
  /** Mutable estimate of gold we expect to accumulate (used at Trade time). */
  projectedGold: number;
}

function planCost(plan: PlannedItem[], vectorById: Map<string, ActionVector>): number {
  let total = 0;
  for (const item of plan) {
    const v = vectorById.get(item.actionId);
    if (!v) continue;
    total += v.adjustedTicks * item.loops;
  }
  return total;
}

/**
 * Closed-form reward count for an explore item. The kth completion (1-indexed)
 * fires a reward iff `(lifetimeChecked + k) % R === 0`; total rewards in
 * `loops` completions is the number of R-boundary crossings.
 */
function exploreRewardsFired(lifetimeChecked: number, loops: number, R: number): number {
  if (R <= 0 || loops <= 0) return 0;
  return Math.floor((lifetimeChecked + loops) / R) - Math.floor(lifetimeChecked / R);
}

/**
 * Push a non-regular item — progression, trade, trainer, basic-mana. Mana
 * projection uses `manaPerCompletion × loops` (averaged); for completion-
 * effect kinds these are exact, for progress-type they're 0.
 */
function pushNonRegular(
  planState: PlanState,
  vector: ActionVector,
  loops: number,
  kind: PlanItemMeta['kind'],
): void {
  if (loops <= 0) return;
  planState.plan.push({ actionId: vector.def.id, loops });
  planState.meta.push({ kind, vector, lifetimeCheckedAtItemStart: 0 });
  planState.projectedManaAdded += vector.manaPerCompletion * loops;
  planState.projectedGold += vector.goldPerCompletion * loops;
}

/**
 * Push a regular-action whole-item with closed-form reward projection.
 * One call per source per category (known-good, explore) — the engine's
 * per-completion `checkOne` handles chain integrity inside the item.
 */
function pushRegularItem(
  planState: PlanState,
  vector: ActionVector,
  loops: number,
  kind: 'known-good-mana' | 'explore-mana' | 'known-good-gold' | 'explore-gold',
  lifetimeCheckedAtItemStart: number,
): void {
  if (loops <= 0) return;
  const isKnownGood = kind === 'known-good-mana' || kind === 'known-good-gold';
  const rewardsFired = isKnownGood
    ? loops
    : exploreRewardsFired(lifetimeCheckedAtItemStart, loops, vector.rewardRatio);
  planState.plan.push({ actionId: vector.def.id, loops });
  planState.meta.push({ kind, vector, lifetimeCheckedAtItemStart });
  if (rewardsFired <= 0) return;
  const rewardMana = vector.manaPerCompletion * vector.rewardRatio;
  const rewardGold = vector.goldPerCompletion * vector.rewardRatio;
  planState.projectedManaAdded += rewardMana * rewardsFired;
  planState.projectedGold += rewardGold * rewardsFired;
}

/**
 * Reduce the tail item's `loops` by 1, syncing `projectedManaAdded` and
 * `projectedGold` to the closed-form reward count for the new shape. When
 * an item's `loops` reaches 0, it's removed and the next tail becomes the
 * new trim target. Returns false when there's nothing left to trim.
 *
 * Reward unwinding is exact for known-good and explore kinds; non-regular
 * kinds use the averaged `manaPerCompletion`/`goldPerCompletion` semantics
 * from `pushNonRegular`.
 */
function shrinkTailByOne(planState: PlanState): boolean {
  const idx = planState.plan.length - 1;
  if (idx < 0) return false;
  const item = planState.plan[idx]!;
  const meta = planState.meta[idx]!;
  const v = meta.vector;

  if (item.loops <= 1) {
    // Removing the whole item — unwind its full mana/gold contribution.
    if (meta.kind === 'known-good-mana' || meta.kind === 'known-good-gold') {
      const rewardMana = v.manaPerCompletion * v.rewardRatio;
      const rewardGold = v.goldPerCompletion * v.rewardRatio;
      planState.projectedManaAdded -= rewardMana * item.loops;
      planState.projectedGold -= rewardGold * item.loops;
    } else if (meta.kind === 'explore-mana' || meta.kind === 'explore-gold') {
      const rewardsFired = exploreRewardsFired(
        meta.lifetimeCheckedAtItemStart,
        item.loops,
        v.rewardRatio,
      );
      const rewardMana = v.manaPerCompletion * v.rewardRatio;
      const rewardGold = v.goldPerCompletion * v.rewardRatio;
      planState.projectedManaAdded -= rewardMana * rewardsFired;
      planState.projectedGold -= rewardGold * rewardsFired;
    } else {
      planState.projectedManaAdded -= v.manaPerCompletion * item.loops;
      planState.projectedGold -= v.goldPerCompletion * item.loops;
    }
    planState.plan.pop();
    planState.meta.pop();
    return true;
  }

  // Drop the last completion — adjust projection delta for that one
  // completion only.
  const newLoops = item.loops - 1;
  if (meta.kind === 'known-good-mana' || meta.kind === 'known-good-gold') {
    const rewardMana = v.manaPerCompletion * v.rewardRatio;
    const rewardGold = v.goldPerCompletion * v.rewardRatio;
    planState.projectedManaAdded -= rewardMana;
    planState.projectedGold -= rewardGold;
  } else if (meta.kind === 'explore-mana' || meta.kind === 'explore-gold') {
    const before = exploreRewardsFired(meta.lifetimeCheckedAtItemStart, item.loops, v.rewardRatio);
    const after = exploreRewardsFired(meta.lifetimeCheckedAtItemStart, newLoops, v.rewardRatio);
    const rewardMana = v.manaPerCompletion * v.rewardRatio;
    const rewardGold = v.goldPerCompletion * v.rewardRatio;
    planState.projectedManaAdded -= rewardMana * (before - after);
    planState.projectedGold -= rewardGold * (before - after);
  } else {
    planState.projectedManaAdded -= v.manaPerCompletion;
    planState.projectedGold -= v.goldPerCompletion;
  }
  planState.plan[idx] = { actionId: item.actionId, loops: newLoops };
  return true;
}

export function generatePlan(
  engine: PlannerAccessor,
  params: PlannerParams = DEFAULT_PARAMS,
): PlannedItem[] {
  const initialMana = engine.tryInject(InitialManaKey);
  if (!initialMana) return [];

  const vectors = projectActionVectors(engine);
  const vectorById = new Map(vectors.map((v) => [v.def.id, v]));
  const visible = vectors.filter((v) => v.visible);

  const planState: PlanState = {
    plan: [],
    meta: [],
    projectedManaAdded: 0,
    projectedGold: 0,
  };

  // ─── Pass 1: unified mana harvest ───────────────────────────────────
  // Single priority class spanning direct-mana (regular→add-mana, plus
  // basic completion-effect mana grants) and gold-routed (regular→add-
  // gold + trade closer). Each source contributes 0–2 candidates
  // (known-good cash-in and/or explore). Sort by per-tick mana-equivalent
  // EV; emit best-first. Subsequent gold-routed candidates ride the same
  // trade closer, which appends once at end-of-pass under the PolicyB
  // cost-of-trade gate.
  interface HarvestCandidate {
    vector: ActionVector;
    loops: number;
    kind: 'known-good-mana' | 'explore-mana' | 'basic-mana' | 'known-good-gold' | 'explore-gold';
    evPerTick: number;
  }

  const trade = visible.find((v) => v.passSegment === 'trade');
  const exchangeMult =
    trade && trade.def.type === 'basic' ? Number(trade.def.exchangeMult ?? 0) : 0;

  const candidates: HarvestCandidate[] = [];
  for (const v of visible) {
    if (!v.productive || v.adjustedTicks <= 0) continue;
    if (v.passSegment === 'mana') {
      if (v.def.type === 'regular') {
        const rewardMana = v.manaPerCompletion * v.rewardRatio;
        if (v.knownGoodCount > 0) {
          // Known-good fires a full reward per loop — EV = rewardMana / tick.
          candidates.push({
            vector: v,
            loops: v.knownGoodCount,
            kind: 'known-good-mana',
            evPerTick: rewardMana / v.adjustedTicks,
          });
        }
        if (v.poolCapacity > 0) {
          const fired = exploreRewardsFired(v.lifetimeChecked, v.poolCapacity, v.rewardRatio);
          const totalMana = rewardMana * fired;
          const totalCost = v.adjustedTicks * v.poolCapacity;
          candidates.push({
            vector: v,
            loops: v.poolCapacity,
            kind: 'explore-mana',
            evPerTick: totalCost > 0 ? totalMana / totalCost : 0,
          });
        }
      } else {
        // Basic mana grant — one-shot completion-effect.
        candidates.push({
          vector: v,
          loops: 1,
          kind: 'basic-mana',
          evPerTick: v.manaPerCompletion / v.adjustedTicks,
        });
      }
    } else if (v.passSegment === 'gold' && v.def.type === 'regular' && exchangeMult > 0) {
      // Gold-routed candidates only emerge once trade is visible (otherwise
      // exchangeMult = 0, gold has no mana-equivalent value). Trade overhead
      // is amortized across all gold candidates that emit in a single loop:
      // ranking ignores the trade tax, the PolicyB gate at end-of-pass
      // applies it once. Net effect under canonical content (50× exchange):
      // gold-routed dominates direct mana once errand/latch pools bear
      // rewards.
      const rewardGold = v.goldPerCompletion * v.rewardRatio;
      if (v.knownGoodCount > 0) {
        candidates.push({
          vector: v,
          loops: v.knownGoodCount,
          kind: 'known-good-gold',
          evPerTick: (rewardGold * exchangeMult) / v.adjustedTicks,
        });
      }
      if (v.poolCapacity > 0) {
        const fired = exploreRewardsFired(v.lifetimeChecked, v.poolCapacity, v.rewardRatio);
        const totalMana = rewardGold * exchangeMult * fired;
        const totalCost = v.adjustedTicks * v.poolCapacity;
        candidates.push({
          vector: v,
          loops: v.poolCapacity,
          kind: 'explore-gold',
          evPerTick: totalCost > 0 ? totalMana / totalCost : 0,
        });
      }
    }
  }

  candidates.sort((a, b) => b.evPerTick - a.evPerTick);

  let goldRoutedEmitted = false;
  for (const c of candidates) {
    if (c.kind === 'basic-mana') {
      pushNonRegular(planState, c.vector, c.loops, 'basic-mana');
    } else {
      pushRegularItem(planState, c.vector, c.loops, c.kind, c.vector.lifetimeChecked);
      if (c.kind === 'known-good-gold' || c.kind === 'explore-gold') goldRoutedEmitted = true;
    }
  }

  // PolicyB cost-of-trade gate. Closed-form-dominant over a static
  // tradeThreshold knob: emit iff `projectedGold × exchangeMult >
  // tradeAdjustedTicks`. Same outcome EV-positive, strictly better
  // EV-negative (saves trade overhead on chains that wouldn't pay for
  // themselves), no false positives.
  if (goldRoutedEmitted && trade && planState.projectedGold * exchangeMult > trade.adjustedTicks) {
    pushNonRegular(planState, trade, 1, 'trade');
    planState.projectedManaAdded += planState.projectedGold * exchangeMult;
    planState.projectedGold = 0;
  }

  // ─── Pass 2: progression (ticks-budget chunks) ──────────────────────
  // For each visible progress-action with `progressionTarget[pvId] > 0`,
  // emit one `{progress, loops: floor(chunkTicks / pvAdjustedTicks)}`
  // item per loop. Budget-shaped (not target-shaped): cross-loop XP
  // accumulates naturally, no closed-form `xpToReachLevel` math.
  // Late-arc cost reduction shrinks pvAdjustedTicks, so chunks scale up
  // automatically as the arc progresses.
  const chunkTicks = params.progressionChunkTicks;
  for (const v of visible) {
    if (v.passSegment !== 'progression' || v.def.type !== 'progress') continue;
    if (v.progressVarXpPerCompletion <= 0 || v.adjustedTicks <= 0) continue;
    const targetWeight = params.progressionTarget[v.def.progressVarId] ?? 1;
    if (targetWeight <= 0) continue;
    const loopsPerChunk = Math.floor(chunkTicks / v.adjustedTicks);
    if (loopsPerChunk <= 0) continue;
    pushNonRegular(planState, v, loopsPerChunk, 'progression');
  }

  // ─── Pass 3: budget trim ────────────────────────────────────────────
  // Tail-shrink: reduce the last item's `loops` until total cost fits
  // `initialMana × oversupplyFactor + projectedManaAdded`. Items only
  // disappear when their `loops` reaches 0. Reward projection unwinds as
  // loops shrink past R-boundaries, but the budget cap is computed once
  // and held fixed — over-keeps slightly when reward-firing items get
  // trimmed (acceptable conservatism).
  const oversupply = params.manaUpOversupplyFactor;
  const budgetCap = Number(initialMana.value) * oversupply + planState.projectedManaAdded;
  while (planCost(planState.plan, vectorById) > budgetCap && planState.plan.length > 0) {
    if (!shrinkTailByOne(planState)) break;
  }

  // ─── Pass 4: strategic trainers (opt-in) ────────────────────────────
  // Trainers are strategic, not bootstrap. Default plans contain zero
  // trainers; only strategies with `talentOverflowThreshold > 0` engage
  // this pass to soak slack budget into rotating capability training.
  if (params.talentOverflowThreshold > 0) {
    const remaining = budgetCap - planCost(planState.plan, vectorById);
    if (remaining >= params.talentOverflowThreshold) {
      fillWithRotatingTrainers(planState, remaining, visible);
    }
  }

  return planState.plan;
}

/**
 * Pass 7 helper (strategic trainers — opt-in via `talentOverflowThreshold`).
 * Round-robins through visible trainers (basic + capability-segment +
 * expMult ≥ 4), appending one loop per cycle, until either the remaining
 * budget is consumed or no trainer fits the leftover headroom.
 *
 * The "consecutive skip" guard exits cleanly when the only-remaining-budget
 * fits no trainer's adjustedTicks — without it the rotation would loop
 * forever skipping over too-expensive trainers.
 */
function fillWithRotatingTrainers(
  planState: PlanState,
  remainingBudget: number,
  visible: ActionVector[],
): void {
  const trainers = visible.filter(
    (v) => v.def.type === 'basic' && v.passSegment === 'capability' && Number(v.def.expMult) >= 4,
  );
  if (trainers.length === 0) return;

  let budget = remainingBudget;
  let i = 0;
  let consecutiveSkips = 0;
  while (budget > 0 && consecutiveSkips < trainers.length) {
    const v = trainers[i % trainers.length];
    i++;
    if (v.adjustedTicks > budget) {
      consecutiveSkips++;
      continue;
    }
    consecutiveSkips = 0;
    pushNonRegular(planState, v, 1, 'trainer');
    budget -= v.adjustedTicks;
  }
}
