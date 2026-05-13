/**
 * Looper balance — goal predicates for the queue-of-queues solver.
 *
 * A goal is the solver's search target: a predicate over engine state
 * (the cross-loop state vector + per-loop residuals) plus a sim-time
 * budget within which the predicate must fire. Trajectories satisfying
 * the predicate within budget are *reachable*; the perturbation sweep's
 * feasibility frontier records, for each (goal × tunable-perturbation)
 * pair, whether the solver found a reachable trajectory.
 *
 * Predicate AST mirrors the engine's `ICondition` shape — `and`/`or`/`not`
 * compositions over typed leaves drawn from `LooperGameState`. This keeps
 * goals declarative (serializable, replayable, mod-configurable) without
 * coupling to the engine's generic `GameStateAccessor` string-path mapping
 * — looper's leaves are richer (typed stat-tier, typed progress-var) than
 * `StateCondition`'s `(stateId: string) => Decimal` shape would express.
 *
 * Three representative goals (`REPRESENTATIVE_GOALS`) anchor the first-arc
 * solver pass:
 *
 *   - `reach-forest-1` — single-leaf reach-zone goal (`forest ≥ 1`). The
 *     algorithm-choice prototype's primary case: A* + beam side-by-side at
 *     canonical settings to settle which algorithm fronts the harness.
 *   - `stat-tier-compound` — conjunction goal (`Per Talent ≥ 1` ∧
 *     `loops ≥ 3`). Stresses the cross-loop Talent compound; matches the
 *     Gather Herbs unlock condition.
 *   - `wander-time-bound` — single-leaf, tight time budget. Stresses the
 *     burned-run pattern (mana-negative loops that pay off cumulatively).
 *
 * Per BALANCING.md § Theme 3 #7: as the solver harness matures, the goal
 * set may grow to cover representative shapes across the unlock graph.
 * Three goals is the floor — diminishing returns past ~5–7 in the first
 * leaf per the OL-959 uncertainty list.
 */

import type { Engine } from '@open-loop/engine';
import {
  getStatLevel,
  getTalentLevel,
  getProgressLevel,
  getLoopCount,
  getTimesCompleted,
} from '../modules';

// ─── Predicate AST ────────────────────────────────────────────────────────

/** Reach-zone leaf — persistent progress-var level ≥ value (cross-loop). */
export interface ProgressVarLevelLeaf {
  kind: 'progress-var-level';
  progressVarId: string;
  value: number;
}

/** Stat-tier leaf — Level (per-loop) or Talent (persistent) ≥ value. */
export interface StatTierLevelLeaf {
  kind: 'stat-tier-level';
  statId: string;
  tier: 'level' | 'talent';
  value: number;
}

/** Action completion-count leaf — persistent timesCompleted ≥ value. */
export interface ActionCompletionLeaf {
  kind: 'action-completion-count';
  actionId: string;
  value: number;
}

/** Loop-count leaf — persistent loop counter ≥ value (1-indexed). */
export interface LoopCountLeaf {
  kind: 'loop-count';
  value: number;
}

/** Conjunction — all children must hold. Short-circuits on first false. */
export interface AndPredicate {
  kind: 'and';
  children: GoalPredicate[];
}

/** Disjunction — at least one child must hold. Short-circuits on first true. */
export interface OrPredicate {
  kind: 'or';
  children: GoalPredicate[];
}

/** Negation. */
export interface NotPredicate {
  kind: 'not';
  child: GoalPredicate;
}

export type GoalPredicate =
  | ProgressVarLevelLeaf
  | StatTierLevelLeaf
  | ActionCompletionLeaf
  | LoopCountLeaf
  | AndPredicate
  | OrPredicate
  | NotPredicate;

// ─── Evaluation ───────────────────────────────────────────────────────────

/**
 * Evaluate a goal predicate against the engine's current state via the
 * looper module accessors. The `_engine` parameter is required for shape
 * symmetry with `BeatProbe.predicate`; module accessors read singleton
 * state set up by `install()`, so the engine handle is not used directly.
 */
export function evaluateGoal(predicate: GoalPredicate, _engine: Engine): boolean {
  switch (predicate.kind) {
    case 'progress-var-level':
      return getProgressLevel(predicate.progressVarId) >= predicate.value;
    case 'stat-tier-level': {
      const level =
        predicate.tier === 'talent'
          ? getTalentLevel(predicate.statId)
          : getStatLevel(predicate.statId);
      return level.gte(predicate.value);
    }
    case 'action-completion-count':
      return getTimesCompleted(predicate.actionId).gte(predicate.value);
    case 'loop-count':
      return getLoopCount().value >= predicate.value;
    case 'and':
      return predicate.children.every((c) => evaluateGoal(c, _engine));
    case 'or':
      return predicate.children.some((c) => evaluateGoal(c, _engine));
    case 'not':
      return !evaluateGoal(predicate.child, _engine);
  }
}

// ─── Goal record ──────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  /** One-line description of what reaching this goal looks like in-game. */
  intent: string;
  predicate: GoalPredicate;
  /**
   * Maximum sim-time in seconds the solver searches before declaring
   * infeasibility. Should comfortably exceed the canonical-setting
   * trajectory's expected sim-time so perturbations that lengthen the
   * arc still resolve as reachable rather than truncated.
   */
  budgetSec: number;
}

// ─── Representative goals (first-arc anchors) ─────────────────────────────

const min = (m: number) => m * 60;

/**
 * Single-leaf reach-zone goal. Forest Path zone is meaningfully entered
 * once any forest-path progress-var has level ≥ 1; `forest` itself is the
 * canonical first one. The unlock chain that drives this:
 *
 *   - Wander grows `wander` (progress var, persistent).
 *   - `wander ≥ 5` unlocks Forest Path action.
 *   - Forest Path action grows `forest` progress var.
 *   - `forest ≥ 1` completes the first arc's first zone entry.
 *
 * The solver's job: construct a multi-loop trajectory that pushes
 * `forest` to 1 within `budgetSec`. Greedy outer search gets trapped
 * spending all mana on Smash Pots once wander is high enough to make
 * pots mana-positive; the correct trajectory burns at least one loop on
 * Wander past the cliff, then runs Forest Path the next loop. This is
 * the primary algorithm-choice prototype case (A* + beam side-by-side at
 * canonical settings).
 */
export const REACH_FOREST_1: Goal = {
  id: 'reach-forest-1',
  intent: 'First Forest Path zone entry — forest progress-var level ≥ 1',
  predicate: { kind: 'progress-var-level', progressVarId: 'forest', value: 1 },
  budgetSec: min(30),
};

/**
 * Stat-tier compound goal — Talent on Perception ≥ 1 (the persistent half
 * of the canonical two-tier stat split) AND loops ≥ 3 (the loop-count
 * prereq surface). Matches the Gather Herbs unlock condition in the
 * first-arc port. Stresses two unrelated cross-loop state channels at
 * once and requires the solver to plan around two compounding
 * trajectories simultaneously.
 *
 * Perception talent grows from Smash Pots + Forest Path (both carry
 * Per weight); reaching Talent 1 requires roughly enough Per-weighted
 * action volume to exceed the talent-skill XP curve at 1% accrual ratio.
 */
export const STAT_TIER_COMPOUND: Goal = {
  id: 'stat-tier-compound',
  intent: 'Stat-tier two-axis compound — Per Talent ≥ 1 across ≥ 3 loops',
  predicate: {
    kind: 'and',
    children: [
      { kind: 'stat-tier-level', statId: 'Per', tier: 'talent', value: 1 },
      { kind: 'loop-count', value: 3 },
    ],
  },
  budgetSec: min(45),
};

/**
 * Time-bounded wander-max goal. Tight sim-time budget stresses the
 * burned-run pattern — the solver has to find loops where it sacrifices
 * mana-positive output to grow wander faster than greedy per-loop
 * optimization would, because the time budget doesn't admit a "clear
 * the pool every loop, growth is incidental" strategy.
 *
 * Wander 10 is the third-or-fourth unlock cliff in the first arc and
 * sits comfortably past the Forest Path opening (wander ≥ 5), so the
 * trajectory has to land at least one mid-arc burned run.
 */
export const WANDER_TIME_BOUND: Goal = {
  id: 'wander-time-bound',
  intent: 'Wander progress-var level ≥ 10 within a tight time budget',
  predicate: { kind: 'progress-var-level', progressVarId: 'wander', value: 10 },
  budgetSec: min(20),
};

export const REPRESENTATIVE_GOALS: readonly Goal[] = [
  REACH_FOREST_1,
  STAT_TIER_COMPOUND,
  WANDER_TIME_BOUND,
] as const;
