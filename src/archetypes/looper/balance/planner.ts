/**
 * Looper plan generator — backward-induction queue planner.
 *
 * Pure logic. Reads live engine state, produces a plan as
 * `Array<{actionId, loops}>`. The bot module (`bot.ts`) consumes this plan
 * and writes it to the queue on `loop.afterRestart`.
 *
 * # Principles
 *
 * 1. **Mana gen is the priority.** The plan emission order, and Pass-7's
 *    tail-pop trim consequently, rank mana-generating actions ahead of
 *    everything else. Cracking the manapot (cash-in known-goods + reward-
 *    firing explores) is the loop's primary work; progression supports it;
 *    trade is conditional; trainers are strategic.
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
 *    explicitly — closed-form per-loop chunking + correct priority
 *    ordering produce the right per-loop plan, and lifetime engine state
 *    evolves the bootstrap naturally across loops.
 *
 * 4. **Tunable values match design reality.** When budget tunables
 *    (`balance/initialMana`, `manaUpOversupplyFactor`) drift to
 *    compensate for planner correctness gaps, the planner is the bug —
 *    not the tunable. Fix the planner; restore the canonical baseline.
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
 * # Plan passes
 *
 * Emission order = execution order = trim-survivability order. Pass-6
 * end-pop trim drops worst-EV items first by virtue of plan being built
 * best-first. Each regular-type source is decomposed into per-call
 * atoms (see `planRegularChunks`) and emitted as one contiguous block
 * per source — chain integrity is load-bearing.
 *
 *   1. **Mana cash-in (known-good)** — `goodTemp > 0` consumption on
 *      mana-emitting regulars. Each atom = 1 known-good call = 1 full
 *      reward; cheapest mana per tick. Every banked good cashed in.
 *
 *   2. **Mana explore chain** — per-call atoms in lifetime-`checked`
 *      order. Each atom k fires a reward iff
 *      `(lifetimeChecked + k) % rewardRatio === 0`. Emitted contiguously
 *      so trim's end-pop preserves the productive prefix — atom k's
 *      reward semantics depend on atoms 1..k−1 having run first.
 *
 *   3. **Progression** — progress-type actions targeting visible
 *      progressVars per `progressionTarget` deltas. Optionally chunked
 *      via `progressionChunkSize` so trim can drop partially. Multi-
 *      loop investment (grows pools / unlocks zones for future loops).
 *
 *   4. **Gold sources toward Trade** — same per-call atom shape as mana.
 *      Bounded by `tradeThreshold` — emission stops when projected gold
 *      meets the trade threshold. Cross-loop banking past threshold is
 *      left to future-loop chains.
 *
 *   5. **Trade** — basic-type `exchange-gold-to-mana` if projected gold
 *      meets the threshold.
 *
 *   6. **Budget trim** — drops items end-first until total cost fits
 *      `initialMana × manaUpOversupplyFactor + projectedManaAdded`.
 *      Within each per-source atom block, end-pop drops banking-tail
 *      atoms before reward-firing prefix atoms — productive prefix
 *      survives under tight budget.
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
 * # Per-call atomization (OL-787)
 *
 * Reward-firing chunks were originally emitted multi-call atomic
 * (size = `r_dist` for the first chunk, `R` for full cycles), with a
 * base-budget fit-check skipping chunks too large for `initialMana`.
 * This collapsed under canonical content: `crack.manaCost = 200` ×
 * `rewardRatio = 10` = 2000 ticks for the first reward-firing chunk,
 * dwarfing the 250-tick budget. Cracking never entered the plan;
 * bootstrap was impossible.
 *
 * The fix atomizes to per-call (size 1) atoms across the whole pool.
 * Atom k carries its predicted `rewardsFired ∈ {0, 1}` based on chain
 * position. Trim drops from chain end, banking-tail atoms first; the
 * productive prefix (atoms 1..min(U, baseBudget/cost)) survives. Across
 * loops, lifetime `checked` accumulates and the reward firer migrates
 * earlier in the chain — eventually a banking atom becomes a firing
 * atom, and the loop yields its first reward.
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
    let lifetimeChecked = 0;
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
 * Push a regular-action chunk with explicit reward count. Replaces the
 * averaged-grant `pushItem` for regulars: each fired reward grants the
 * full `rewardAmount = manaPerCompletion × rewardRatio`, not a fraction
 * proportional to the chunk size. `pushItem`'s averaged math is correct
 * only when chunks are exactly rewardRatio-aligned starting from a fresh
 * boundary; this helper handles known-good chunks, mid-cycle first
 * chunks, full-R cycles, and zero-reward tails uniformly.
 */
function pushRegularChunk(
  planState: PlanState,
  vector: ActionVector,
  loops: number,
  rewardsFired: number,
): void {
  if (loops <= 0) return;
  planState.plan.push({ actionId: vector.def.id, loops });
  if (rewardsFired <= 0) return;
  const rewardMana = vector.manaPerCompletion * vector.rewardRatio;
  const rewardGold = vector.goldPerCompletion * vector.rewardRatio;
  planState.projectedManaAdded += rewardMana * rewardsFired;
  planState.projectedGold += rewardGold * rewardsFired;
}

/**
 * Per-call atom decomposition for one loop's worth of dispatch against a
 * regular pool. Mirrors `regular-vars.ts:checkOne` semantics with
 * searchToggle=true (looper hardcoded):
 *
 *   1. Known-goods consumed first (`goodTemp > 0` branch). G calls, each
 *      fires a full reward, no `checked` change.
 *   2. Then explore unchecked. Each call increments lifetime `checked`;
 *      the atom at chain position k (1-indexed) fires iff
 *      `(lifetimeChecked + k) % rewardRatio === 0`.
 *
 * Returns size-1 atoms in execution order. Chain integrity is load-
 * bearing: atom k's reward semantics depend on atoms 1..k−1 having
 * executed first. Pass-6 trim pops from plan end, which preserves the
 * productive prefix of the chain naturally — dropping atoms from the
 * tail leaves earlier atoms' (lifetimeChecked, k) reasoning intact.
 *
 * Routing categories (`known-good` / `reward-fire` / `tail`) are
 * metadata only; the planner emits all atoms of a regular source as one
 * contiguous block in execution order, never splitting reward-firers
 * from their banking prefix across passes.
 */
type ChunkCategory = 'known-good' | 'reward-fire' | 'tail';

interface RegularChunk {
  /** Always 1 — kept on the type for shape compat with `pushRegularChunk`. */
  loops: number;
  /** 0 or 1. */
  rewardsFired: number;
  category: ChunkCategory;
}

function planRegularChunks(
  knownGoodCount: number,
  poolCapacity: number,
  lifetimeChecked: number,
  rewardRatio: number,
): RegularChunk[] {
  const chunks: RegularChunk[] = [];

  for (let i = 0; i < knownGoodCount; i++) {
    chunks.push({ loops: 1, rewardsFired: 1, category: 'known-good' });
  }

  if (poolCapacity <= 0 || rewardRatio <= 0) return chunks;

  for (let k = 1; k <= poolCapacity; k++) {
    const fires = (lifetimeChecked + k) % rewardRatio === 0;
    chunks.push({
      loops: 1,
      rewardsFired: fires ? 1 : 0,
      category: fires ? 'reward-fire' : 'tail',
    });
  }

  return chunks;
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

  // Pre-compute regular sources' atom chains. Each source's atoms are
  // emitted as one contiguous block in execution order; chain integrity is
  // load-bearing (atom k's reward depends on atoms 1..k−1 having run).
  const manaSources = visible
    .filter((v) => v.passSegment === 'mana' && v.productive && v.def.type === 'regular')
    .sort((a, b) => b.manaPerCompletion / b.adjustedTicks - a.manaPerCompletion / a.adjustedTicks);
  const manaChunks = manaSources.map((v) => ({
    v,
    chunks: planRegularChunks(v.knownGoodCount, v.poolCapacity, v.lifetimeChecked, v.rewardRatio),
  }));

  // Basic mana grants are non-regular completion-effect emitters (e.g., a
  // future "Drink Tonic"). Treat as best-EV alongside known-goods.
  const basicManaGrants = visible.filter(
    (v) => v.passSegment === 'mana' && v.productive && v.def.type !== 'regular',
  );

  // ─── Pass 1: mana cash-in (known-good) ──────────────────────────────
  // `goodTemp > 0` consumption — cheapest mana per tick. Always queued
  // first. Each call fires a full reward without consuming pool capacity.
  for (const { v, chunks } of manaChunks) {
    for (const chunk of chunks) {
      if (chunk.category !== 'known-good') continue;
      pushRegularChunk(planState, v, chunk.loops, chunk.rewardsFired);
    }
  }
  // Basic mana grants (one-shot completion-effect emitters) ride alongside
  // known-goods in priority — they're direct grants, not exploration.
  for (const v of basicManaGrants) {
    pushItem(planState, v, 1);
  }

  // ─── Pass 2: mana explore chain ─────────────────────────────────────
  // Per-call atoms in lifetime-`checked` order. Each atom fires a reward
  // iff its chain-position k satisfies `(lifetimeChecked + k) % R === 0`.
  // Emitted contiguously so trim's end-pop preserves the productive
  // prefix — dropping atoms from the tail keeps earlier atoms' reward
  // semantics intact. Replaces OL-782's reward-fire / tail pass split,
  // which broke chain integrity by routing boundary-crossing atoms into
  // a different pass than their banking prefix.
  for (const { v, chunks } of manaChunks) {
    for (const chunk of chunks) {
      if (chunk.category === 'known-good') continue;
      pushRegularChunk(planState, v, chunk.loops, chunk.rewardsFired);
    }
  }

  // ─── Pass 3: progression ────────────────────────────────────────────
  // For each visible progress-action, allocate loops to gain the per-id
  // `progressionTarget` level delta. Default delta = +1. When
  // `progressionChunkSize` is set, the per-progressVar delta is split
  // across multiple chunkSize-loop items so Pass-7 trim can drop partially
  // (see `progressionChunkSize` doc for rationale).
  //
  // Multi-loop investment: progression grows regularVar pools and unlocks
  // gated content for future loops. Within a single loop, mid-loop
  // level-ups also extend pools that LATER passes' chunks can dip into —
  // but the planner's chunks are static (sized at plan-build), so within-
  // loop pool growth from progression does not retroactively grow chunk
  // sizes. The cross-loop effect is what matters.
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
      for (let i = 0; i < fullChunks; i++) pushItem(planState, v, chunkSize);
      if (tail > 0) pushItem(planState, v, tail);
    } else {
      pushItem(planState, v, loops);
    }
  }

  // ─── Pass 4: gold sources toward Trade ──────────────────────────────
  // Same per-call atom shape as mana (Pass 1 + 2): known-good atoms
  // emitted first, then explore-atom chain, contiguous. Gold's lifetime
  // `checked` accumulates across loops post-OL-778, so its reward firing
  // shares the same chain-integrity semantics as mana — banking atoms
  // cross loops toward the next boundary crossing even though gold
  // *balance* zeroes per-loop reset.
  //
  // Stops emitting per source once `goldRemaining` (toward
  // `tradeThreshold`) hits zero. Trade fires once per loop, so overshoot
  // atoms beyond the threshold compete with mana/progression for budget
  // without funding more this-loop trade. Cross-loop gold banking past
  // threshold is left to future-loop chains.
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
      const chunks = planRegularChunks(
        v.knownGoodCount,
        v.poolCapacity,
        v.lifetimeChecked,
        v.rewardRatio,
      );
      for (const chunk of chunks) {
        if (goldRemaining <= 0) break;
        pushRegularChunk(planState, v, chunk.loops, chunk.rewardsFired);
        goldRemaining -= goldPerReward * chunk.rewardsFired;
      }
    }
  }

  // ─── Pass 5: trade ──────────────────────────────────────────────────
  if (params.tradeThreshold !== 'never') {
    const tradeVector = visible.find((v) => v.passSegment === 'trade');
    if (tradeVector && planState.projectedGold >= params.tradeThreshold) {
      pushItem(planState, tradeVector, 1);
      const exchangeMult = Number(
        tradeVector.def.type === 'basic' ? (tradeVector.def.exchangeMult ?? 0) : 0,
      );
      planState.projectedManaAdded += planState.projectedGold * exchangeMult;
      planState.projectedGold = 0;
    }
  }

  // ─── Pass 6: budget trim ────────────────────────────────────────────
  // Total cost must fit `initialMana × oversupplyFactor + projectedManaAdded`.
  // End-pop drops items in reverse emission order: trainers (if any) →
  // trade → gold-chain end → progression → mana-chain end →
  // known-goods. Worst-EV first by emission order; chain integrity
  // preserved within each per-source atom block since end-pop drops
  // banking-tail atoms first and reward-firing prefix last.
  const oversupply = params.manaUpOversupplyFactor;
  const budgetCap = Number(initialMana.value) * oversupply + planState.projectedManaAdded;
  while (planCost(planState.plan, vectorById) > budgetCap && planState.plan.length > 0) {
    planState.plan.pop();
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
    pushItem(planState, v, 1);
    budget -= v.adjustedTicks;
  }
}
