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
 *
 * Engine-as-oracle posture (`archetypes/BALANCING.md § Engine as oracle`):
 *   - Methodology #1 (`solve.ts`) — deterministic-bot-driven runs against
 *     `runUntil`; bisects single tunables per beat.
 *   - Methodology #2 (`predict.ts` + `spec.ts`) — frozen-state queries
 *     against `getCost(1)` / `getTotalRate`; triangular multi-resource
 *     walker per algebra § 6.3 / § 6.6.
 *   - Bridge (`verify.ts`) — diffs predictor vs sim per-waypoint to catch
 *     engine-side primitive drift.
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
  /** Arc budget in sim-seconds. Producer is a ~1.5h archetype; the
   *  scaffolding targets the signature-compound phase upper bound. Forks
   *  compressing below ~60min or extending past ~180min are re-shaping,
   *  not re-tuning. */
  arcBudgetSec: 90 * 60,
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
] as const;

/**
 * Per-subsystem methodology declaration. Producer is single-subsystem
 * (continuous-producer-with-modifier-chain) and single-methodology (#1+#2
 * over a triangular multi-resource composition row). See
 * `archetypes/BALANCING.md § Bucket → methodology lookup` for the full
 * bucket × methodology cross-reference.
 *
 * Subsystem inventory: `closed-form-progression/subsystem-inventory.md
 * § 3.2` — Producer 8 rows, 7 Pure + 1 Optimal stopping (87.5% decomposable).
 * The 1 OS row (single-tier prestige timing analog) is not modeled in this
 * slim port; the modeled subsystem is the Pure row.
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
    | 'CombinatorialSelection';
  methodology: '#1' | '#2' | '#1+#2' | '#3' | '#4' | '#5' | '#6';
  compositionRow: 'triangular' | 'piecewise' | 'modifier-product' | 'series' | 'sum' | null;
  canonicalSurface: 'cited' | 'invention' | 'mixed';
  inventionKnobs: readonly string[];
}

export const PRODUCER_SUBSYSTEMS: readonly SubsystemMethodology[] = [
  {
    id: 'continuous-producers',
    bucket: 'Pure',
    methodology: '#1+#2',
    compositionRow: 'triangular',
    // Bakery slim-port content is declared invention (no canonical exemplar
    // numbers carried 1:1). All numeric surfaces are perturbation surface.
    canonicalSurface: 'invention',
    inventionKnobs: [
      'producers/cursor/purchase/baseCost',
      'producers/grandma/purchase/baseCost',
      'balance/tier1UpgradeMultiplier',
      'balance/milestoneBonusPerTier',
    ],
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
 *
 * 6-band keys map directly to `flow-channel-thresholds.md § 1.2` channels.
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
