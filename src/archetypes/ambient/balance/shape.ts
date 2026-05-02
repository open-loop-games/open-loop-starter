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
 *   - Arc is multi-hour cumulative — not continuous. Sessions in reality are
 *     distributed; the beat map measures accumulated sim-time regardless of
 *     wall-clock distribution. For headless sim, wall-clock = sim-clock.
 *   - Signature climax is mid-arc scene diversification — visual depth
 *     without engagement demand (Rusty's-Retirement / Chillquarium /
 *     Tiny-Pasture identity).
 *   - Zero-click contract — auto-production runs without input. Manual
 *     clicking is a bonus, not a requirement.
 */

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc. The archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. */
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
  /** Cumulative sim-time budget for the headless beat span. Matches
   *  `offlineCapHours: 12` so a single overnight session can land the
   *  full beat span. */
  arcBudgetSec: 12 * 60 * 60,
  /** Minimum content cardinality the mid-arc beats lean on. Soft floor —
   *  scaffolding ships with 5 producers + 12 unlocks + 6 scene variants
   *  + 20 achievements. */
  minAutoProducers: 3,
  minSceneVariants: 3,
  /**
   * Signature climax metric. Numeric magnitudes are mutable; the metric
   * shape (mid-arc scene-variant unlocked alongside a mid-tier producer
   * owned) is the archetype centerpiece per AMBIENT_PHASES § beat-5.
   */
  signatureMetric: 'midSceneUnlock.active AND midProducerOwned',
} as const;

/**
 * Ordered player-experience phases. The order and intent of each are part
 * of the identity; the concrete beat predicate and minute-window expressing
 * each phase live in `beats.ts` and are mutable.
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
