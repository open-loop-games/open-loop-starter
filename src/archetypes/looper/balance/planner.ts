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
 * 1. **Mana gen is the priority.** Plan emission order ranks mana-
 *    generating actions ahead of everything else. Cracking the manapot
 *    (cash-in known-goods + reward-firing explores) is the loop's primary
 *    work; progression supports it; trade is conditional; trainers are
 *    strategic.
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
 * # Whole-item emission (OL-788)
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
 * to (B) is single-file, ~20 lines; the trigger is leaf-4 solver finding
 * it can't tune to a beat window because static budgeting is too slack.
 *
 * # Plan passes
 *
 * Emission order = execution order = trim-survivability order. Pass-6
 * tail-shrink trim reduces worst-EV items first by virtue of plan being
 * built best-first.
 *
 *   1. **Mana cash-in (known-good)** — `goodTemp > 0` consumption on
 *      mana-emitting regulars. One item per source: `{actionId, loops:
 *      knownGoodCount}`. Cheapest mana per tick.
 *
 *   2. **Mana explore** — `{actionId, loops: poolCapacity}` per visible
 *      mana-regular. Engine's per-completion `checkOne` accumulates
 *      lifetime `checked` and fires rewards on R-boundaries naturally.
 *
 *   3. **Progression** — progress-type actions targeting visible
 *      progressVars per `progressionTarget` deltas. Optionally chunked
 *      via `progressionChunkSize` so trim can drop partially. Multi-
 *      loop investment (grows pools / unlocks zones for future loops).
 *
 *   4. **Gold sources toward Trade** — same whole-item emission as mana.
 *      Bounded at emission by `tradeThreshold` — emit only enough loops
 *      per source to project meeting the threshold. Cross-loop banking
 *      past threshold is left to future-loop chains.
 *
 *   5. **Trade** — basic-type `exchange-gold-to-mana` if projected gold
 *      meets the threshold.
 *
 *   6. **Budget trim** — shrinks the tail item's `loops` until total cost
 *      fits `initialMana × manaUpOversupplyFactor + projectedManaAdded`,
 *      removing items only when their `loops` reaches 0. Reward-projection
 *      drops as `loops` shrinks past R-boundaries; budget cap is computed
 *      once at the start of trim and held fixed (matches pre-OL-788
 *      conservatism — over-keeps slightly when reward-firing items get
 *      trimmed but their projection contribution doesn't unwind).
 *
 *   7. **Strategic trainers** *(opt-in, `talentOverflowThreshold > 0`)* —
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
   * Per-progressVar chunk size for the progression pass. Each
   * `progressionTarget` delta emits as multiple `chunkSize`-loop items
   * rather than one monolithic item, so Pass-7 trim drops chunks at this
   * granularity instead of all-or-nothing.
   *
   * Default `undefined` resolves to **1** at plan time — single-loop
   * chunks. This matches the "no loop is standalone" principle: bootstrap
   * arcs span many loops with small per-loop progress, and single-loop
   * trim granularity lets tight initial budgets admit one progression
   * step per loop rather than dropping the entire delta.
   *
   * Strategies that prefer coarser-grained trim can set this higher
   * (e.g., `4` to drop 4 loops at a time), but the cost is risk of
   * dropping the whole chunk when it doesn't fit. `0` is treated as
   * "no chunking" (single big item) — discouraged outside debugging.
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
  tradeThreshold: 100,
  talentOverflowThreshold: 0,
};

// ─── XP curve helpers ─────────────────────────────────────────────────────

/**
 * Inverse of `level = floor((sqrt(8x/100 + 1) - 1) / 2)`: solving for the XP
 * threshold gives `xp_for_level_N = 50 × N × (N + 1)`. Vanilla idle-loops
 * progress-var curve (zones.ts:476).
 */
function xpForLevel(level: number): number {
  return 50 * level * (level + 1);
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

  const manaSources = visible
    .filter((v) => v.passSegment === 'mana' && v.productive && v.def.type === 'regular')
    .sort((a, b) => b.manaPerCompletion / b.adjustedTicks - a.manaPerCompletion / a.adjustedTicks);

  // Basic mana grants are non-regular completion-effect emitters (e.g., a
  // future "Drink Tonic"). Treat as best-EV alongside known-goods.
  const basicManaGrants = visible.filter(
    (v) => v.passSegment === 'mana' && v.productive && v.def.type !== 'regular',
  );

  // ─── Pass 1: mana cash-in (known-good) ──────────────────────────────
  // `goodTemp > 0` consumption — cheapest mana per tick. One whole-item
  // per source: `{actionId, loops: knownGoodCount}`. Engine's checkOne
  // consumes goodTemp first per completion, so the item runs as
  // knownGoodCount full reward fires with no `checked` accumulation.
  for (const v of manaSources) {
    if (v.knownGoodCount > 0) {
      pushRegularItem(planState, v, v.knownGoodCount, 'known-good-mana', v.lifetimeChecked);
    }
  }
  // Basic mana grants (one-shot completion-effect emitters) ride alongside
  // known-goods in priority — they're direct grants, not exploration.
  for (const v of basicManaGrants) {
    pushNonRegular(planState, v, 1, 'basic-mana');
  }

  // ─── Pass 2: mana explore ───────────────────────────────────────────
  // One whole-item per source: `{actionId, loops: poolCapacity}`. Engine's
  // checkOne increments lifetime `checked` per completion and fires
  // rewards on R-boundaries naturally — no atom decomposition needed.
  // Pass-6 trim shrinks the item's `loops` if budget can't afford the
  // full pool.
  for (const v of manaSources) {
    if (v.poolCapacity > 0) {
      pushRegularItem(planState, v, v.poolCapacity, 'explore-mana', v.lifetimeChecked);
    }
  }

  // ─── Pass 3: progression ────────────────────────────────────────────
  // For each visible progress-action, allocate loops to gain the per-id
  // `progressionTarget` level delta. Default delta = +1. When
  // `progressionChunkSize` is set, the per-progressVar delta is split
  // across multiple chunkSize-loop items so Pass-6 trim can drop partially
  // (see `progressionChunkSize` doc for rationale).
  //
  // Multi-loop investment: progression grows regularVar pools and unlocks
  // gated content for future loops.
  const progressVars = engine.tryInject(ProgressVarsKey);
  // `undefined` = default per-loop chunks. `0` = no chunking (single item).
  // `> 0` = explicit chunk size.
  const chunkSize = params.progressionChunkSize ?? 1;
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
    if (chunkSize > 0 && loops > chunkSize) {
      const fullChunks = Math.floor(loops / chunkSize);
      const tail = loops - fullChunks * chunkSize;
      for (let i = 0; i < fullChunks; i++) pushNonRegular(planState, v, chunkSize, 'progression');
      if (tail > 0) pushNonRegular(planState, v, tail, 'progression');
    } else {
      pushNonRegular(planState, v, loops, 'progression');
    }
  }

  // ─── Pass 4: gold sources toward Trade ──────────────────────────────
  // Whole-item emission, capped per source so projected gold meets
  // `tradeThreshold` without overshoot. Cross-loop gold banking past
  // threshold is left to future-loop chains. Gold's lifetime `checked`
  // accumulates across loops post-OL-778, so reward firing migrates
  // earlier in the chain naturally as later loops crack into the same
  // pool.
  if (params.tradeThreshold !== 'never') {
    const goldSources = visible
      .filter((v) => v.passSegment === 'gold' && v.productive && v.def.type === 'regular')
      .sort(
        (a, b) => b.goldPerCompletion / b.adjustedTicks - a.goldPerCompletion / a.adjustedTicks,
      );
    let goldRemaining = params.tradeThreshold;
    for (const v of goldSources) {
      if (goldRemaining <= 0) break;
      const goldPerReward = v.goldPerCompletion * v.rewardRatio;
      if (goldPerReward <= 0) continue;

      // Known-good portion: each loop fires a reward.
      if (v.knownGoodCount > 0 && goldRemaining > 0) {
        const rewardsNeeded = Math.ceil(goldRemaining / goldPerReward);
        const knownGoodLoops = Math.min(v.knownGoodCount, rewardsNeeded);
        pushRegularItem(planState, v, knownGoodLoops, 'known-good-gold', v.lifetimeChecked);
        goldRemaining -= goldPerReward * knownGoodLoops;
      }

      // Explore portion: kth reward fires at `k * R - (lifetimeChecked % R)`
      // completions. Cap at poolCapacity.
      if (v.poolCapacity > 0 && goldRemaining > 0) {
        const R = v.rewardRatio;
        const offset = v.lifetimeChecked % R;
        const rewardsNeeded = Math.ceil(goldRemaining / goldPerReward);
        const loopsForRewards = rewardsNeeded * R - offset;
        const exploreLoops = Math.min(v.poolCapacity, Math.max(0, loopsForRewards));
        if (exploreLoops > 0) {
          pushRegularItem(planState, v, exploreLoops, 'explore-gold', v.lifetimeChecked);
          const fired = exploreRewardsFired(v.lifetimeChecked, exploreLoops, R);
          goldRemaining -= goldPerReward * fired;
        }
      }
    }
  }

  // ─── Pass 5: trade ──────────────────────────────────────────────────
  if (params.tradeThreshold !== 'never') {
    const tradeVector = visible.find((v) => v.passSegment === 'trade');
    if (tradeVector && planState.projectedGold >= params.tradeThreshold) {
      pushNonRegular(planState, tradeVector, 1, 'trade');
      const exchangeMult = Number(
        tradeVector.def.type === 'basic' ? (tradeVector.def.exchangeMult ?? 0) : 0,
      );
      planState.projectedManaAdded += planState.projectedGold * exchangeMult;
      planState.projectedGold = 0;
    }
  }

  // ─── Pass 6: budget trim ────────────────────────────────────────────
  // Tail-shrink: reduce the last item's `loops` until total cost fits
  // `initialMana × oversupplyFactor + projectedManaAdded`. Items only
  // disappear when their `loops` reaches 0. Reward projection unwinds as
  // loops shrink past R-boundaries, but the budget cap is computed once
  // and held fixed — over-keeps slightly when reward-firing items get
  // trimmed (matches pre-OL-788 conservatism).
  const oversupply = params.manaUpOversupplyFactor;
  const budgetCap = Number(initialMana.value) * oversupply + planState.projectedManaAdded;
  while (planCost(planState.plan, vectorById) > budgetCap && planState.plan.length > 0) {
    if (!shrinkTailByOne(planState)) break;
  }

  // ─── Pass 7: strategic trainers (opt-in) ────────────────────────────
  // Trainers are strategic, not bootstrap. Canonically (idle-loops
  // vanilla), trainers cost MORE than multiple explores — the player
  // chooses them deliberately for stat building or as late-arc boosters.
  // Default plans contain zero trainers; only strategies with
  // `talentOverflowThreshold > 0` engage this pass to soak slack budget
  // into rotating capability training.
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
