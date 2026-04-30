/**
 * Looper plan generator — backward-induction queue planner.
 *
 * Pure logic. Reads live engine state, produces a plan as
 * `Array<{actionId, loops}>`. The bot module (`bot.ts`) consumes this plan
 * and writes it to the queue on `loop.afterRestart`.
 *
 * # Shape
 *
 * Closed-form arithmetic over existing engine introspection. No forward-
 * simulator, no snapshot-state primitive. Per-action cost reads
 * `actions.getState(id).adjustedTicks` (already a reactive ComputedRef).
 * Level-up gaps come from the inverse XP curve (`xp_for_level_N = 4N²`,
 * since both capabilities and progressVars use
 * `level = floor(sqrt(xp) / 2)`). Visibility comes from the existing
 * prereq matching shape — same predicates that gate the queue's `canStart`.
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
 * to (B) is single-file, ~20 lines; the trigger is leaf-4 solver finding
 * it can't tune to a beat window because static budgeting is too slack.
 *
 * # Plan layering
 *
 * The plan composes seven passes, in order, against a live action-vector
 * snapshot:
 *
 *   1. **Capability training** — basic actions with no rewards (Stretch,
 *      Tend, Listen, Attune). One iteration each. Cheap, builds early
 *      cost-reduction. Pruned in over-budget trim if necessary.
 *
 *   2. **Gold accumulation** — regular-type actions emitting `add-gold`
 *      with productive pool capacity. Allocated to fund Trade.
 *
 *   3. **Mana extension** — regular-type actions emitting `add-mana` with
 *      productive pool capacity. Drain pool to its grant capacity.
 *
 *   4. **Trade** — basic-type with `exchange-gold-to-mana`. One iteration
 *      after gold accumulation has filled the pouch.
 *
 *   5. **Progression** — progress-type actions targeting visible
 *      progressVars. Allocated by `progressionTarget[id]` level deltas
 *      (default: +1 per visible progressVar).
 *
 *   6. **Budget trim** — drops tail items until total cost fits the
 *      `initialMana × manaUpOversupplyFactor + projectedManaAdded` cap.
 *
 *   7. **Talent overflow** *(opt-in via `talentOverflowThreshold > 0`)* —
 *      if remaining headroom exceeds the threshold, append rotating
 *      capability-trainer iterations (`expMult ≥ 4` basics) until consumed.
 *      Disabled by default; `farm-talent`'s override engages this pass to
 *      soak mana-rich loops into compounded talent gain.
 *
 * Productive-zero actions (regular pools below `rewardRatio` threshold,
 * progress actions whose target is at level cap) are excluded at vector-
 * build time. Visibility reflects the player's drawer — pruned actions
 * exist but aren't reachable.
 *
 * # Budget feasibility
 *
 * Total plan cost (`Σ adjustedTicks × loops`) must fit
 * `initialMana × manaUpOversupplyFactor + expectedManaAdded`. The default
 * `oversupplyFactor = 1.0` is the tight budget; mana-up grants from
 * regular actions in pass 3 conceptually extend the cap mid-loop, so the
 * planned cost can exceed `initialMana` by the projected `manaAdded`
 * (sum across `add-mana` rewards expected to fire).
 *
 * Over-budget trim drops items in reverse-pass order: progression first
 * (lowest priority for short-term loop survival), then Trade, then mana
 * extension, then gold accumulation, then capability training. Keeps the
 * loop alive at the cost of slower long-term progress.
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
   * Per-progressVar level-delta target. Default applied at plan time:
   * `+1` for every visible progressVar with a visible progress-action.
   * Solver perturbs per-id; goal-strategies (3b) override wholesale.
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
   * Minimum gold buffer at which Trade fires. Set to `'never'` to skip
   * Trade entirely (used by `farm-gold-buffer` when stockpiling gold for
   * persistent-purchase forks; canonical in-loop accumulation pairs with a
   * numeric threshold).
   */
  tradeThreshold: number | 'never';
  /**
   * When `> 0`, after Pass 6 (budget trim) the planner runs Pass 7 (talent
   * overflow): if remaining headroom in the budget cap exceeds this
   * threshold, the planner appends rotating capability-trainer iterations
   * (basic actions classified `'capability'` with `expMult ≥ 4` — the
   * canonical idle-loops training-multiplier signature) until the budget
   * is consumed. Drives `farm-talent`'s "swap to talent-soak when mana is
   * plentiful" mode without growing the override surface beyond
   * `PlannerParams`. Default `0` = disabled (other strategies leave it off).
   */
  talentOverflowThreshold: number;
  /**
   * Per-progressVar chunk size for Pass 5. When set, each progressionTarget
   * delta is emitted as multiple `chunkSize`-loop items rather than a single
   * monolithic item. Pass 6 trims tail items in chunk-sized increments,
   * preserving partial progression under tight budgets instead of dropping
   * the entire delta when the full block doesn't fit.
   *
   * Default `undefined` = no chunking (single item per progressVar). Strategies
   * with progression deltas exceeding the loop-1 budget should set this so
   * Pass 6 trims partially — `farm-mana-pool`'s canonical `{roam:2, trail:2}`
   * emits 16-loop items that trim all-or-nothing under the rung-1 budget,
   * making beat-3 unfireable; chunking to 4 trims partially and lands beat-3
   * inside its [30s, 2m] window.
   */
  progressionChunkSize?: number;
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
   * "Productive" — for regular actions, true iff at least one reward can
   * fire this loop (`poolCapacity ≥ rewardRatio` for fresh-discovery OR
   * `knownGoodCount > 0` for known-good consumption); for non-regular,
   * true iff visible. Productive-zero actions are still in the vector
   * list but the planner skips them in passes 2 + 3.
   */
  productive: boolean;
  /** Fast-classifier for plan-pass dispatch. */
  passSegment: 'capability' | 'gold' | 'mana' | 'trade' | 'progression' | 'skip';
}

// ─── Defaults ─────────────────────────────────────────────────────────────

export const DEFAULT_PARAMS: PlannerParams = {
  progressionTarget: {},
  manaUpOversupplyFactor: 1.0,
  tradeThreshold: 100,
  talentOverflowThreshold: 0,
};

// ─── XP curve helpers ─────────────────────────────────────────────────────

/** Inverse of `level = floor(sqrt(xp) / 2)`: `xp_for_level_N = 4N²`. */
function xpForLevel(level: number): number {
  return 4 * level * level;
}

/** XP needed to advance from current state to `targetLevel`. */
function xpToReachLevel(currentLevel: number, currentXp: number, targetLevel: number): number {
  if (targetLevel <= currentLevel) return 0;
  return Math.max(0, xpForLevel(targetLevel) - currentXp);
}

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
    const manaCost = Number(state.manaCost.value);
    // adjustedExp = expMult × (manaCost / adjustedTicks). expMult=1 across the
    // canonical action set; the multiply preserves shape for forks that retune.
    const adjustedExp = Decimal.mul(def.expMult, Decimal.div(manaCost, adjustedTicks));

    let progressVarXpPerCompletion = 0;
    let manaPerCompletion = 0;
    let goldPerCompletion = 0;
    let poolCapacity = 0;
    let knownGoodCount = 0;
    let rewardRatio = 0;

    if (def.type === 'progress') {
      const pvDef = progressVars.getDef(def.progressVarId);
      if (pvDef) {
        progressVarXpPerCompletion = Number(Decimal.mul(pvDef.expMult, adjustedExp));
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

    // Productive: regular actions fire at least one reward this loop iff
    // the pool admits a fresh-discovery cycle (`poolCapacity >=
    // rewardRatio`) OR known-goods are queued for cheap consumption.
    // Non-regular: productive iff visible (basic + progress are
    // immediately productive when visible).
    const productive =
      visible &&
      (def.type !== 'regular' ||
        (rewardRatio > 0 && (poolCapacity >= rewardRatio || knownGoodCount > 0)));

    vectors.push({
      def,
      adjustedTicks,
      progressVarXpPerCompletion,
      manaPerCompletion,
      goldPerCompletion,
      poolCapacity,
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

interface PlanState {
  plan: PlannedItem[];
  /** Mutable estimate of mana we expect to add over the loop (sum of `manaPerCompletion × loops`). */
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

function pushItem(planState: PlanState, vector: ActionVector, loops: number): void {
  if (loops <= 0) return;
  planState.plan.push({ actionId: vector.def.id, loops });
  planState.projectedManaAdded += vector.manaPerCompletion * loops;
  planState.projectedGold += vector.goldPerCompletion * loops;
}

/**
 * Push an item whose `loops` consume known-goods (`goodTemp` branch). Each
 * completion fires `rewardAmount` directly (not the averaged
 * `rewardAmount / rewardRatio`), so projected mana / gold add at the full
 * reward per loop. Caller must guarantee `loops <= vector.knownGoodCount`.
 */
function pushKnownGoodItem(planState: PlanState, vector: ActionVector, loops: number): void {
  if (loops <= 0) return;
  planState.plan.push({ actionId: vector.def.id, loops });
  // Effective per-completion grant on the goodTemp branch = averaged ×
  // rewardRatio = full rewardAmount per fired reward.
  const ratio = vector.rewardRatio;
  planState.projectedManaAdded += vector.manaPerCompletion * ratio * loops;
  planState.projectedGold += vector.goldPerCompletion * ratio * loops;
}

/**
 * Loops needed for a regular-type action to deliver `targetGrant` of its
 * primary reward, capped at pool capacity. Returns the smallest multiple
 * of rewardRatio that hits the target while staying within pool.
 */
function loopsForRegularGrant(
  vector: ActionVector,
  targetGrant: number,
  perCompletionGrant: number,
): number {
  if (perCompletionGrant <= 0 || vector.rewardRatio <= 0) return 0;
  // perCompletionGrant is the AVERAGED grant (rewardAmount / rewardRatio).
  // To deliver `targetGrant`, need targetGrant / perCompletionGrant completions.
  // Round up to the next rewardRatio multiple so we land on a reward boundary.
  const minLoops = Math.ceil(targetGrant / perCompletionGrant);
  const aligned = Math.ceil(minLoops / vector.rewardRatio) * vector.rewardRatio;
  return Math.min(aligned, vector.poolCapacity);
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
    projectedManaAdded: 0,
    projectedGold: 0,
  };

  // ─── Pass 1: capability training (cheap basic-no-reward actions) ────
  // Always 1 loop each. Cheap, builds early cost-reduction so subsequent
  // passes execute faster than the static budget projects.
  for (const v of visible) {
    if (v.passSegment === 'capability') {
      pushItem(planState, v, 1);
    }
  }

  // ─── Pass 2: gold accumulation ──────────────────────────────────────
  // Productive gold-emitting regulars. Allocated to fund the trade
  // threshold. Multiple gold sources sum into the projected pouch.
  // Two-phase per source: cash in known-goods first (1 loop = 1 full
  // rewardAmount), then explore cycles for the remainder.
  if (params.tradeThreshold !== 'never') {
    const goldSources = visible
      .filter((v) => v.passSegment === 'gold' && v.productive)
      // Highest gold-per-tick first.
      .sort(
        (a, b) => b.goldPerCompletion / b.adjustedTicks - a.goldPerCompletion / a.adjustedTicks,
      );
    let goldRemaining = params.tradeThreshold;
    for (const v of goldSources) {
      if (goldRemaining <= 0) break;

      if (v.knownGoodCount > 0) {
        const goldPerKnownGood = v.goldPerCompletion * v.rewardRatio;
        if (goldPerKnownGood > 0) {
          const knownNeeded = Math.ceil(goldRemaining / goldPerKnownGood);
          const knownLoops = Math.min(v.knownGoodCount, knownNeeded);
          if (knownLoops > 0) {
            pushKnownGoodItem(planState, v, knownLoops);
            goldRemaining -= goldPerKnownGood * knownLoops;
          }
        }
      }

      if (goldRemaining <= 0) continue;
      const exploreLoops = loopsForRegularGrant(v, goldRemaining, v.goldPerCompletion);
      if (exploreLoops <= 0) continue;
      pushItem(planState, v, exploreLoops);
      goldRemaining -= v.goldPerCompletion * exploreLoops;
    }
  }

  // ─── Pass 3: mana extension (productive regulars + basic mana grants) ─
  // Two-phase enqueue per regular pool, mirroring `regular-vars.ts:checkOne`
  // dispatch order (vanilla `town.js:finishRegular` shape):
  //
  //   1. Cash in known-goods (`goodTemp`): one item with `loops =
  //      knownGoodCount`. Each completion fires a reward at 1 mana cost
  //      via the `goodTemp > 0` branch — high-EV, no exploration.
  //   2. Explore unchecked: one item per reward cycle (`loops =
  //      rewardRatio`), `floor(poolCapacity / rewardRatio)` items total.
  //      Per-cycle chunking mirrors the (γ) Pass-5 fix (OL-768): the
  //      natural granule for partial Pass-6 trim is one full rewardRatio
  //      cycle (rewardRatio loops → 1 reward grant). Sub-cycle splits
  //      don't yield rewards, so the smallest meaningful chunk =
  //      rewardRatio loops. With multi-cycle pools (poolCapacity >
  //      rewardRatio), Pass 6 can drop cycles one at a time instead of
  //      all-or-nothing.
  //
  // The known-good item is split out so Pass-6 can trim explore cycles
  // without sacrificing the cheap cash-in step. With searchToggle = true
  // (hardcoded in `checkOne`), the engine consumes known-goods first
  // when both branches are available; queue ordering is informational
  // here, not load-bearing.
  //
  // Basic-type mana grants (e.g., a future "Drink Tonic" basic that adds
  // mana flat) get one execution.
  const manaSources = visible
    .filter((v) => v.passSegment === 'mana' && v.productive)
    // Highest mana-per-tick first.
    .sort((a, b) => b.manaPerCompletion / b.adjustedTicks - a.manaPerCompletion / a.adjustedTicks);
  for (const v of manaSources) {
    if (v.def.type === 'regular') {
      if (v.knownGoodCount > 0) {
        pushKnownGoodItem(planState, v, v.knownGoodCount);
      }
      const cycles = Math.floor(v.poolCapacity / v.rewardRatio);
      for (let i = 0; i < cycles; i++) {
        pushItem(planState, v, v.rewardRatio);
      }
    } else {
      // Basic mana grant — one execution.
      pushItem(planState, v, 1);
    }
  }

  // ─── Pass 4: trade ──────────────────────────────────────────────────
  if (params.tradeThreshold !== 'never') {
    const tradeVector = visible.find((v) => v.passSegment === 'trade');
    if (tradeVector && planState.projectedGold >= params.tradeThreshold) {
      pushItem(planState, tradeVector, 1);
      // Trade exchanges all gold to mana via exchangeMult — refresh the
      // pouch projection so subsequent passes see the conversion.
      const exchangeMult = Number(
        tradeVector.def.type === 'basic' ? (tradeVector.def.exchangeMult ?? 0) : 0,
      );
      planState.projectedManaAdded += planState.projectedGold * exchangeMult;
      planState.projectedGold = 0;
    }
  }

  // ─── Pass 5: progression ────────────────────────────────────────────
  // For each visible progress-action, allocate loops to gain the per-id
  // progressionTarget level delta. Default delta = +1. When
  // `progressionChunkSize` is set, the per-progressVar delta is split
  // across multiple chunkSize-loop items so Pass 6 can trim partially —
  // see param doc for rationale.
  const progressVars = engine.tryInject(ProgressVarsKey);
  const chunkSize = params.progressionChunkSize;
  for (const v of visible) {
    if (v.passSegment !== 'progression' || v.def.type !== 'progress') continue;
    if (v.progressVarXpPerCompletion <= 0) continue;
    const pvId = v.def.progressVarId;
    const targetDelta = params.progressionTarget[pvId] ?? 1;
    if (targetDelta <= 0) continue;
    const skill = progressVars?.getSkill(pvId);
    if (!skill) continue;
    const currentLevel = Number(skill.level.value);
    const currentXp = Number(skill.xp.value);
    const xpNeeded = xpToReachLevel(currentLevel, currentXp, currentLevel + targetDelta);
    const loops = Math.ceil(xpNeeded / v.progressVarXpPerCompletion);
    if (chunkSize && chunkSize > 0 && loops > chunkSize) {
      let remaining = loops;
      while (remaining > 0) {
        const c = Math.min(chunkSize, remaining);
        pushItem(planState, v, c);
        remaining -= c;
      }
    } else {
      pushItem(planState, v, loops);
    }
  }

  // ─── Pass 6: budget trim ────────────────────────────────────────────
  // Total cost must fit `initialMana × oversupplyFactor + projectedManaAdded`.
  // Drop tail items until we fit. Tail order (last to first by pass) means
  // progression goes first, then trade, then mana, gold, capability —
  // keeping the loop-survival items intact.
  const oversupply = params.manaUpOversupplyFactor;
  const budgetCap = Number(initialMana.value) * oversupply + planState.projectedManaAdded;
  while (planCost(planState.plan, vectorById) > budgetCap && planState.plan.length > 0) {
    planState.plan.pop();
  }

  // ─── Pass 7: talent overflow ────────────────────────────────────────
  // Opt-in via params.talentOverflowThreshold > 0. After trim, any leftover
  // headroom up to the budget cap can be soaked by rotating capability
  // trainers — basic actions classified 'capability' with expMult ≥ 4. The
  // expMult floor matches the canonical idle-loops training-multiplier
  // signature, so Trek (basic, capability-pass-classified, expMult 1)
  // doesn't get pulled into the rotation as a high-cost bridge action.
  if (params.talentOverflowThreshold > 0) {
    const remaining = budgetCap - planCost(planState.plan, vectorById);
    if (remaining >= params.talentOverflowThreshold) {
      fillWithRotatingTrainers(planState, remaining, visible);
    }
  }

  return planState.plan;
}

/**
 * Pass 7 helper. Round-robins through visible trainers (basic + capability-
 * segment + expMult ≥ 4), appending one loop per cycle, until either the
 * remaining budget is consumed or no trainer fits the leftover headroom.
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
    pushItem(planState, v, 1);
    budget -= v.adjustedTicks;
  }
}
