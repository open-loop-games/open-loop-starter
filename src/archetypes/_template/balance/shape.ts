/**
 * <Archetype> archetype shape — identity (fixed) vs scaffolding (mutable).
 *
 * This file is scaffold. Copy the whole `_template/balance/` directory to
 * `src/archetypes/<archetype>/balance/` and fill in the `TODO(fill-in)`
 * sites. The working example is `src/archetypes/producer/balance/` —
 * consult it for concrete shapes (phase list, beat predicates, solver
 * bracket sizing, bot policy).
 *
 * Layered contract (see `archetypes/BALANCING.md`):
 *   identity   (this file)            FIXED
 *   scaffolding (beats.ts, data/*.ts, bot.ts)   MUTABLE
 *   tools      (solve.ts)             search
 *   locks      (sim/*.probe.test.ts)  regressions after choices land
 *
 * When a phase can't be expressed under current scaffolding, coordinate a
 * reshape across layers — retune vs reshape content vs reshape predicate vs
 * move the phase — instead of contorting one constant.
 */

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc. The archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. Lifted verbatim from
   *  `archetypes/<archetype>.md` § 4 — do not paraphrase. */
  intent: string;
  /** Beat id in `beats.ts` currently expressing this phase. Mutable — a
   *  phase may migrate between beats as predicates/windows reshape. */
  currentBeatId: string | null;
}

/**
 * What's FIXED about this archetype. Forks changing any of this are no
 * longer this archetype — they've forked into a sibling or hybrid.
 */
export const ARCHETYPE_IDENTITY = {
  // TODO(fill-in): archetype id matching the directory + doc file stem
  archetypeId: '<archetype>' as const,

  // TODO(fill-in): arc budget in sim-seconds, from <archetype>.md § 1.
  // Forks compressing below ~70% or extending past ~150% of this are
  // reshaping, not retuning.
  arcBudgetSec: 0,

  // TODO(fill-in): minimum content cardinalities this archetype is
  // sensitive to. Soft floors — scaffolding may ship with more. Example
  // from producer: minContinuousProducers=5, minGlobalUpgrades=4.

  // TODO(fill-in): signature climax metric. Expression referencing engine
  // state. Numeric magnitude is mutable; the metric shape is fixed.
  signatureMetric: '<expression>',
} as const;

/**
 * Ordered player-experience phases, from `<archetype>.md` § 4. The order
 * and intent of each are part of the identity; the concrete beat predicate
 * and minute-window expressing each phase live in `beats.ts` and are
 * mutable.
 */
export const ARCHETYPE_PHASES: readonly PhaseIntent[] = [
  // TODO(fill-in): one entry per phase, in order.
  // {
  //   id: 'first-<thing>',
  //   order: 1,
  //   intent: 'Onboarding — core feedback loop confirmed',
  //   currentBeatId: 'beat-1',
  // },
] as const;

/**
 * Flow-band weights for the arc-scoring objective function. Scores the
 * arc's flow channel (from `src/balance/flow-probe.ts`) into a single
 * number the solver can optimise against, decoupling good-feel from
 * hit-this-exact-second beat constraints.
 *
 * Player-experience-calibrated, not engine-data-driven. Tune by playtest
 * feedback, not by sim output.
 */
export const FLOW_BAND_SCORE = {
  arousal: 1,
  flow: 2,
  'flow-upper': 1,
  boredom: -1,
  frustration: -3,
  breakdown: -5,
} as const;
