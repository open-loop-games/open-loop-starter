/**
 * Looper balance — identity layer + cross-loop state vector + posture.
 *
 * Methodology #7 (solver-driven balance) per `archetypes/BALANCING.md`
 * § Theme 3 #7. The shape here is NOT the producer/ambient pattern of
 * per-beat windowed predicates bisected by `runUntil` — looper's economy
 * is queue-of-queues hierarchical planning over deterministic transitions,
 * so the harness produces a *solver* that constructs a multi-loop
 * trajectory under a parameter setting, plus a perturbation sweep over
 * `LooperTunableKey`.
 *
 * Two declarative halves under one file:
 *
 *   - Identity: archetype invariants (`LOOPER_IDENTITY`), the cross-loop
 *     state vector inventory (`LOOPER_CROSS_LOOP_STATE`), and the player-
 *     experience phases (`LOOPER_PHASES`). What's FIXED about Looper —
 *     forks changing any of this fork into a sibling archetype.
 *   - Subsystem methodology declaration (`LOOPER_SUBSYSTEMS`): single-row,
 *     `Discrete planning / scheduling` bucket per the inventory carve.
 *
 * Representative goals + their predicates live in `goals.ts`; the queue-
 * executing sim engine lives in `bot.ts`; solver + sweep land in
 * `solver.ts` + `solve.ts` once the algorithm-choice prototype settles
 * (A* + beam side-by-side on `forest ≥ 1`).
 *
 * Engine-as-oracle posture (`archetypes/BALANCING.md § Engine as oracle`):
 * the solver reads cross-loop state via module-public accessors
 * (`getStatLevel`, `getProgressLevel`, `getLoopCount`, action
 * `timesCompleted`) — same surface the in-game UI reads. It never
 * reimplements game mechanics; the engine is the math, the solver is the
 * search.
 *
 * Canonical-port note: first-arc per-action numbers (manaCost, weights,
 * rewardRatio, progressAmount, etc.) are vanilla canonical and carried
 * 1:1 from `idle-loops-ng`. Perturbing them deforms the canonical economy
 * — forks balance by perturbing the three `LooperTunableKey` scalars and
 * re-running the solver to verify design intent stays reachable within
 * the arc budget. See `LooperTunableKey` in `modules/tuning.ts`.
 */

import type { LooperTunableKey } from '../modules';

// ─── Identity ─────────────────────────────────────────────────────────────

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc; the archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. */
  intent: string;
  /**
   * Goal id (in `goals.ts`'s `REPRESENTATIVE_GOALS`) currently expressing
   * this phase, or `null` when the phase is implicit / not solver-targeted.
   */
  currentGoalId: string | null;
}

/**
 * What's FIXED about Looper. Forks changing any of this are no longer the
 * Looper archetype — they've forked into a sibling archetype or hybrid.
 *
 * Looper identity points (vs Producer / Ambient):
 *
 *   - The loop reset IS the prestige tier — state survives along multiple
 *     channels (stats, progressVars, loop count) and intermediate loops
 *     can be intentionally sacrificial (burned runs growing cross-loop
 *     state, not mana-positive output).
 *   - Mana IS time — the loop's time budget is a depletable resource that
 *     resets each loop. Cross-loop progression spends mana to grow state
 *     that makes future loops larger or unlocks content that wasn't
 *     reachable before.
 *   - Queue choice at loop N is coupled to expected state at start of
 *     loop N+1. Greedy outer search (min per-loop time) over-spends mana
 *     on actions that don't compound and gets trapped behind unlock
 *     cliffs.
 *   - Per-action numbers are vanilla canonical — the perturbation surface
 *     is the three cross-cutting scalars, not the per-action grid.
 */
export const LOOPER_IDENTITY = {
  archetypeId: 'looper' as const,
  /**
   * Arc budget in sim-seconds for the first-arc port (Beginnersville +
   * Forest Path zones). Vanilla idle-loops first-arc completion (forest ≥ 1
   * with talent + loop-count prereqs satisfied) lands ~25–45 min of sim-
   * time under canonical settings. Solver search budgets cap at ~2.5× this
   * value before declaring infeasibility.
   */
  arcBudgetSec: 45 * 60,
  /**
   * Minimum content cardinality the queue-of-queues progression leans on.
   * Soft floor — scaffolding ships with 9 actions + 4 progressVars + 4
   * regularVars + 9 stats. Below ~6 actions or ~3 progressVars the
   * burned-run structure degenerates to "spam one action".
   */
  minActions: 6,
  minProgressVars: 3,
  minStats: 6,
  /**
   * Signature climax metric: `queue-skill-gradient` — the divergence
   * between the solver's chosen queue at loop N+1 and loop N, normalized
   * over the active action set's cardinality. Approaches zero when the
   * player has consolidated on a stable loop shape; peaks during arc
   * transitions (unlock cliffs crossed, new content folding in). The
   * exact formula lands in `verify.ts` once the solver's trajectory shape
   * is concrete; conceptually it captures "the player is still adjusting
   * their queue" vs "the player has settled and is grinding."
   *
   * Mutable as a numeric magnitude; the shape (queue-divergence over a
   * trajectory) is the archetype centerpiece.
   */
  signatureMetric: 'queue-skill-gradient(trajectory)',
} as const;

/**
 * Ordered player-experience phases. The order and intent of each are part
 * of the identity; the concrete goal predicate expressing each phase
 * lives in `goals.ts` and is mutable.
 */
export const LOOPER_PHASES: readonly PhaseIntent[] = [
  {
    id: 'first-loop-completes',
    order: 1,
    intent:
      'Onboarding — mana depletes, the loop restarts, state carries forward (loop reset is the prestige tier)',
    currentGoalId: null,
  },
  {
    id: 'first-progress-level',
    order: 2,
    intent:
      'First persistent gain visible — wander reaches level 1, the pots-pool grows for next loop',
    currentGoalId: null,
  },
  {
    id: 'first-unlock-cliff',
    order: 3,
    intent: 'First content unlock — wander ≥ 5 reveals Forest Path zone and Wild Mana action',
    currentGoalId: 'reach-forest-1',
  },
  {
    id: 'first-burned-run',
    order: 4,
    intent:
      'Sacrificial loop discovered — a mana-negative loop spent purely growing wander pays off next loop',
    currentGoalId: null,
  },
  {
    id: 'stat-tier-compound',
    order: 5,
    intent:
      'Stat-tier two-axis split confirmed — Talent compounds via Per ≥ 1 across loops, unlocking Gather Herbs',
    currentGoalId: 'stat-tier-compound',
  },
  {
    id: 'first-arc-completion',
    order: 6,
    intent:
      'First arc lands — Forest Path zone meaningfully entered, wander has driven multiple unlock cliffs',
    currentGoalId: 'wander-time-bound',
  },
] as const;

/**
 * Cross-loop state vector inventory. The solver's outer-search state-space
 * variables — what carries across the loop reset and informs queue choice
 * at loop N+1. Loop-local state (mana, per-loop XP, regular-var pools,
 * per-action timesCompleted) is inner-search only and not enumerated here.
 *
 * The variables here are what the solver's state-equality / state-hash
 * function reads when deciding whether two trajectories have converged on
 * the same cross-loop state, and what the heuristic admissibility argument
 * has to bound. Out-of-band rate channels (mana drain via tick callback,
 * per-completion XP, reward-effect mana adds) are notes for the verify
 * step's diff diagnostics, not state-space dimensions.
 */
export const LOOPER_CROSS_LOOP_STATE = {
  /**
   * 9 stats × 2 tiers (Level + Talent). Level XP resets per loop; Talent
   * XP is persistent and drives the cost-reduction multiplier on stat
   * Level XP gain (compounding feedback). Solver tracks Talent XP only;
   * Level resets to 0 each loop.
   */
  talentXP: { count: 9, kind: 'persistent' as const },
  /**
   * Progress-var XP for retention-listed vars (currently 4: wander, met,
   * forest, shortcut per `loop.ts:178` retention build). Drives unlock
   * thresholds + regular-var pool sizing.
   */
  progressVarXP: { count: 4, kind: 'persistent' as const },
  /**
   * Persistent loop counter. Prereq surface for some actions
   * (`loops ≥ 3` gates Gather Herbs in the first arc).
   */
  loopCount: { count: 1, kind: 'persistent' as const },
  /**
   * Best-loop-time. Informational only — not decision-bearing for the
   * solver. Recorded by the engine's Loop primitive.
   */
  bestLoopTime: { count: 1, kind: 'informational' as const },
} as const;

/**
 * Per-subsystem methodology declaration. Looper is single-subsystem
 * (`Discrete planning / scheduling` per `closed-form-progression/
 * subsystem-inventory.md § 5.10`) and single-methodology (#7).
 *
 * The "invention knobs" are the three `LooperTunableKey` scalars — the
 * perturbation surface the solver sweeps. Per-action numbers ship vanilla
 * canonical and aren't perturbation surface; forks reshape content by
 * editing data files, not by perturbing them.
 */
export interface SubsystemMethodology {
  id: string;
  bucket:
    | 'Pure'
    | 'Piecewise'
    | 'CoupledState'
    | 'StrategySpace'
    | 'Stochastic'
    | 'DiscreteEvent'
    | 'NetworkTopological'
    | 'OptimalStopping'
    | 'CombinatorialSelection'
    | 'DiscretePlanningScheduling';
  methodology: '#1' | '#2' | '#1+#2' | '#3' | '#4' | '#5' | '#6' | '#7';
  canonicalSurface: 'cited' | 'invention' | 'mixed';
  inventionKnobs: readonly LooperTunableKey[];
}

export const LOOPER_SUBSYSTEMS: readonly SubsystemMethodology[] = [
  {
    id: 'queue-of-queues-progression',
    bucket: 'DiscretePlanningScheduling',
    methodology: '#7',
    // First-arc per-action grid is carried 1:1 from idle-loops-ng vanilla;
    // the perturbation surface is the cross-cutting scalars only.
    canonicalSurface: 'cited',
    inventionKnobs: ['balance/initialMana', 'balance/costDivisor', 'balance/talentAccrualRatio'],
  },
] as const;

/**
 * Flow-band weights for the eventual arc-scoring objective function.
 * Aligned with producer/ambient siblings — the per-archetype weights are
 * uniform because the bands are player-experience-calibrated, not
 * engine-data-driven. Tune by playtest feedback, not by sim output.
 *
 * Looper's solver currently scores trajectories against goal-reachability
 * within budget, not flow-band occupation. This table is here for when
 * the harness grows a trajectory-level flow-probe (likely a follow-up
 * after the algorithm-choice prototype settles).
 */
export const FLOW_BAND_SCORE = {
  arousal: 1,
  flow: 2,
  'flow-upper': 1,
  boredom: -1,
  frustration: -3,
  breakdown: -5,
} as const;
