/**
 * Producer archetype shape — identity (fixed) vs scaffolding (mutable).
 *
 * The archetype *is* its ordered player-experience phases plus the signature
 * metric it climaxes on. Everything else — beat minute-windows, predicate
 * shapes, concrete costs / rates / multipliers, bot policy, achievement
 * thresholds — was generated in one LLM pass to hang content on the identity,
 * and all of it is subject to co-reshape when a phase can't be expressed
 * under the current scaffolding.
 *
 * The solver and any future tuning tools read identity from here. When a
 * phase is unreachable (e.g. signature metric ≥ 1e6× when the current
 * modifier stack maxes at ~1e4×), the response is to propose coherent shifts
 * across scaffolding — move the beat, reshape content, relax the target —
 * not to contort one constant until the math closes.
 */

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc; the archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. */
  intent: string;
  /** Beat id in `beats.ts` currently expressing this phase. Mutable — a phase
   *  may migrate between beats as predicates/windows reshape. */
  currentBeatId: string | null;
}

/**
 * What's FIXED about Producer. Forks changing any of this are no longer the
 * Producer archetype — they've forked into a sibling archetype or hybrid.
 */
export const PRODUCER_IDENTITY = {
  archetypeId: 'producer' as const,
  /** Arc budget in sim-seconds. Producer is a 1–2h archetype; the scaffolding
   *  targets the upper bound. Forks compressing below ~90min or extending
   *  past ~180min are re-shaping, not re-tuning. */
  arcBudgetSec: 120 * 60,
  /** Minimum content cardinality below which the tier-up feel breaks down.
   *  Soft floor — the scaffolding currently ships with more on both. */
  minContinuousProducers: 5,
  minGlobalUpgrades: 4,
  /** Signature climax metric. Numeric magnitude is mutable; the shape of the
   *  metric (top-owned producer's rate-chain compounding visibly) is the
   *  archetype centerpiece per producer.md § 1. */
  signatureMetric: 'topOwnedProducer.rateChain.apply(baseRate) / baseRate',
} as const;

/**
 * Ordered player-experience phases. The order and the intent of each are
 * part of the identity; the concrete beat predicate and minute-window
 * expressing each phase live in `beats.ts` and are mutable.
 */
export const PRODUCER_PHASES: readonly PhaseIntent[] = [
  {
    id: 'first-click',
    order: 1,
    intent: 'Onboarding — core feedback loop confirmed (click → number goes up)',
    currentBeatId: 'beat-1',
  },
  {
    id: 'first-producer',
    order: 2,
    intent: 'Clicking becomes idling — auto-production begins',
    currentBeatId: 'beat-2',
  },
  {
    id: 'second-producer',
    order: 3,
    intent: 'Inter-tier pacing cadence established',
    currentBeatId: 'beat-3',
  },
  {
    id: 'first-upgrade',
    order: 4,
    intent: 'Modifier chain introduced — long-term pull revealed',
    currentBeatId: 'beat-4',
  },
  {
    id: 'achievement-moment',
    order: 5,
    intent: 'Achievements felt as mechanical multiplier, not decoration',
    currentBeatId: 'beat-5',
  },
  {
    id: 'bulk-buy-moment',
    order: 6,
    intent: 'UX shift to "buy 10 / buy max" as dominant action',
    currentBeatId: 'beat-6',
  },
  {
    id: 'signature-compound',
    order: 7,
    intent: 'Stacked rate-chain visible — the compounded stack that is the reward',
    currentBeatId: 'beat-7',
  },
  {
    id: 'arc-close',
    order: 8,
    intent: 'Top-tier owned, global ladder complete — base arc closed',
    currentBeatId: 'beat-8',
  },
] as const;

/**
 * Flow-band weights for the eventual arc-scoring objective function. Scores
 * the full arc's minute-by-minute flow channel (from `flow-probe.ts`) into
 * a single number the solver can optimise against, decoupling good-feel from
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

/**
 * Pointer — the mutable scaffolding layers the solver perturbs:
 *
 *   - `../data/producers.ts`      numeric constants (cost, rate, growth)
 *   - `../data/upgrades.ts`       tier multipliers, global ladder shape
 *   - `../data/achievements.ts`   threshold set, reward multipliers
 *   - `./beats.ts`                BEAT_WINDOWS, predicate shapes
 *   - `./bot.ts`                  click taper, buy cadence
 *
 * All generated in one pass. All subject to co-reshape when a phase from
 * `PRODUCER_PHASES` can't be expressed under the current scaffolding.
 */
