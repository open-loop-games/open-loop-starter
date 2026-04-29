/**
 * Ambient archetype shape — identity (fixed) vs scaffolding (mutable).
 *
 * Per `archetypes/BALANCING.md`:
 *   identity   (this file)            FIXED
 *   scaffolding (beats.ts, data/*.ts, bot.ts)   MUTABLE
 *   tools      (solve.ts)             search
 *   locks      (sim/*.probe.test.ts)  regressions after choices land
 *
 * Worked example for cross-reference: `src/archetypes/producer/balance/`.
 *
 * Key Ambient identity points (vs Producer):
 *   - Arc is 12h cumulative — not continuous. Sessions in reality are
 *     distributed; the beat map measures accumulated sim-time regardless of
 *     wall-clock distribution. For headless sim, wall-clock = sim-clock.
 *   - Signature climax is the prestige-eligible state, not a multiplier
 *     ceiling. Arc closes when the player *could* prestige, whether they do
 *     or not (Rusty's-Retirement / Chillquarium / Tiny-Pasture identity).
 *   - Zero-click contract — auto-production runs without input. Manual
 *     clicking is a bonus, not a requirement (doc § 8 surface 9).
 *   - 7 beats, not 8 — Ambient deliberately omits a separate "first prestige
 *     completed" milestone (doc § 4 closing note).
 */

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc. The archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. Lifted verbatim from
   *  `archetypes/ambient.md` § 4. */
  intent: string;
  /** Beat id in `beats.ts` currently expressing this phase. Mutable — a
   *  phase may migrate between beats as predicates/windows reshape. */
  currentBeatId: string | null;
}

/**
 * What's FIXED about Ambient. Forks changing any of this are no longer the
 * Ambient archetype — they've forked into a sibling or hybrid.
 */
export const AMBIENT_IDENTITY = {
  archetypeId: 'ambient' as const,
  /** 12 sim-hours, cumulative. Matches `offlineCapHours: 12` so a single
   *  overnight session yields at most one arc-completion. */
  arcBudgetSec: 12 * 60 * 60,
  /** Minimum content cardinality the beat-7 closure depends on. Soft
   *  floor — scaffolding ships with 5 producers + 12 unlocks + 6 scene
   *  variants + 20 achievements. */
  minAutoProducers: 3,
  minSceneVariants: 3,
  /**
   * Signature climax metric. Numeric magnitudes are mutable; the metric
   * shape (resource ≥ threshold AND deepest scene-variant unlock visible)
   * is the archetype centerpiece per ambient.md § 4 beat 7.
   */
  signatureMetric: 'primary >= balance.prestigeEligibleThreshold AND deepestSceneUnlock.active',
} as const;

/**
 * Ordered player-experience phases, from `ambient.md` § 4. The order and
 * intent of each are part of the identity; the concrete beat predicate and
 * minute-window expressing each phase live in `beats.ts` and are mutable.
 */
export const AMBIENT_PHASES: readonly PhaseIntent[] = [
  {
    id: 'first-passive-production',
    order: 1,
    intent: 'First passive production visible — confirms the game produces *without* the player',
    currentBeatId: 'beat-1',
  },
  {
    id: 'first-auto-producer-purchased',
    order: 2,
    intent: 'First auto-producer purchased (T1) — validates cost onboarding',
    currentBeatId: 'beat-2',
  },
  {
    id: 'first-visibility-unlock',
    order: 3,
    intent: 'First visibility unlock revealed — gentle unfold cadence established',
    currentBeatId: 'beat-3',
  },
  {
    id: 'glance-check-payoff',
    order: 4,
    intent:
      'Glance-check value proposition proven — first time the player leaves and returns rewarded',
    // Resume-driven. Not testable in continuous headless sim; verified at
    // runtime via sessionClock.lastResumeGapSec. No solver target.
    currentBeatId: null,
  },
  {
    id: 'mid-arc-scene-diversification',
    order: 5,
    intent: 'Mid-arc scene diversification — visual depth without engagement demand',
    currentBeatId: 'beat-5',
  },
  {
    id: 'first-low-urgency-achievement',
    order: 6,
    intent: 'First low-urgency achievement multiplier — pacing markers, not pressure',
    currentBeatId: 'beat-6',
  },
  {
    id: 'arc-closure',
    order: 7,
    intent: 'Prestige-eligible state reached — the "one-loop-seen" moment',
    currentBeatId: 'beat-7',
  },
] as const;

/**
 * Flow-band weights for the arc-scoring objective function. Player-
 * experience-calibrated, not engine-data-driven. Tune by playtest feedback,
 * not by sim output.
 */
export const FLOW_BAND_SCORE = {
  arousal: 1,
  flow: 2,
  'flow-upper': 1,
  boredom: -1,
  frustration: -3,
  breakdown: -5,
} as const;

/**
 * Pointer — the mutable scaffolding layers the solver perturbs:
 *
 *   - `../data/producers.ts`       baseRate, baseCost, costScaling
 *   - `../data/unlocks.ts`         per-unlock thresholds (gate timing)
 *   - `../data/achievements.ts`    requirement predicates, multipliers
 *   - `../data/scene-variants.ts`  thresholds (couple with unlock entries)
 *   - `./beats.ts`                 BEAT_WINDOWS, predicate shapes
 *   - `./bot.ts`                   zero-click bot, auto-purchase cadence
 *
 * All subject to co-reshape when a phase from `AMBIENT_PHASES` can't be
 * expressed under the current scaffolding (per BALANCING.md § Retune vs
 * reshape).
 */
