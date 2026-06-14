/**
 * Producer balance — identity layer + windows + flow-band score.
 *
 * Two declarative halves under one file:
 *
 *   - Identity: archetype invariants (`PRODUCER_IDENTITY`), the ordered
 *     player-experience phases (`PRODUCER_PHASES`), the subsystem
 *     methodology map (`PRODUCER_SUBSYSTEMS`), and the flow-band score
 *     weights (`FLOW_BAND_SCORE`). What's FIXED about Producer — forks
 *     changing any of this fork into a sibling archetype, not a retune.
 *   - Windows: per-beat sim-second windows (`BEAT_WINDOWS`), the arc-probe
 *     predicates (`ARC_BEATS`), and the flow-probe snapshot midpoints
 *     (`FLOW_BEATS`). Mutable scaffolding — the predicate shape and minute
 *     band expressing each phase live here and are subject to co-reshape
 *     when a phase can't be expressed under the current numbers.
 *
 * The solver and any future tuning tools read identity from the first half;
 * the run / verify / solve drivers read windows + predicates from the
 * second. When a phase is unreachable (e.g. signature metric ≥ 1e6× when
 * the current modifier stack maxes at ~1e4×), the response is to propose
 * coherent shifts across scaffolding — move the beat, reshape content,
 * relax the target — not to contort one constant until the math closes.
 *
 * Engine-as-oracle posture (`archetypes/BALANCING.md § Engine as oracle`):
 *   - Methodology #1 (`solve.ts`) — deterministic-bot-driven runs against
 *     `runUntil`; bisects single tunables per beat.
 *   - Methodology #2 (`spec.ts` + `predict.ts`) — frozen-state queries
 *     against `getCost(1)` / `getTotalRate`; triangular multi-resource
 *     walker per algebra § 6.3 / § 6.6.
 *   - Bridge (`verify.ts`) — diffs predictor vs sim per-waypoint to catch
 *     engine-side primitive drift.
 *
 * Pointer — the mutable scaffolding layers the solver perturbs:
 *
 *   - `../data/producers.ts`      numeric constants (cost, rate, growth)
 *   - `../data/upgrades.ts`       tier multipliers, global ladder shape
 *   - `../data/achievements.ts`   threshold set, reward multipliers
 *   - `./balance.ts` (windows)    BEAT_WINDOWS, predicate shapes
 *   - `./bot.ts`                  click taper, buy cadence
 */

import { Decimal, bn } from '@open-loop/engine';
import { getAchievements, getBuildings, getPrimaryResource, getUpgrades } from '../modules';
import type { BeatProbe, Waypoint } from '@/balance';

// ─── Identity ─────────────────────────────────────────────────────────────

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc; the archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. */
  intent: string;
  /** Beat id (key in `BEAT_WINDOWS`) currently expressing this phase. Mutable
   *  — a phase may migrate between beats as predicates/windows reshape. */
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
 * expressing each phase live in `BEAT_WINDOWS` / `ARC_BEATS` below and are
 * mutable.
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
 * first-arc port; the modeled subsystem is the Pure row.
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
    // Bakery first-arc content is declared invention (no canonical exemplar
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

// ─── Windows ──────────────────────────────────────────────────────────────

const sec = (s: number) => s;
const min = (m: number) => m * 60;

/**
 * Beat windows in seconds. One source of truth for both the flow-probe
 * snapshot midpoints and the arc-probe spec windows.
 *
 * B5/B6/B7 shifted from the original nominal bands to match the default
 * Bakery content set's natural firing density: production/building-milestone
 * achievements cluster in 0–30min, there's a gap before late thresholds
 * (prod-1b, hidden-1e10-lifetime) fire past 60min, and the 1e6× headline
 * multiplier climax lands via tier-1/ii/iia + 480× globals before milestone
 * compounding has much runway left. Forks tuning their own content set may
 * want to restore the original 40–55m / 40–65m / 65–95m bands.
 */
export const BEAT_WINDOWS: Record<string, [number, number]> = {
  'beat-1': [sec(0), sec(30)],
  'beat-2': [min(1), min(3)],
  'beat-3': [min(5), min(10)],
  'beat-4': [min(12), min(20)],
  'beat-5': [min(25), min(45)],
  'beat-6': [min(30), min(50)],
  'beat-7': [min(55), min(90)],
};

const midpoint = (id: string): number => {
  const [lo, hi] = BEAT_WINDOWS[id]!;
  return Math.round((lo + hi) / 2);
};

/**
 * Snapshot points for the flow-probe — taken at each beat's window
 * midpoint so the per-producer pacing reflects the player's likely
 * state during that beat, not at its earliest or latest possible moment.
 */
export const FLOW_BEATS: Waypoint[] = Object.keys(BEAT_WINDOWS).map((id) => ({
  id,
  snapshotAtSec: midpoint(id),
}));

/**
 * Predicates for arc-probe. Trigger decoding:
 *
 * - 1: primary resource ≥ 1 (first click registers).
 * - 2: cursor (tier 1) owned.
 * - 3: grandma (tier 2) owned.
 * - 4: first per-producer upgrade bought (cursor-boost-i is cheapest in current data).
 * - 5: ≥25 achievements earned — proxy for "first achievement-driven
 *   multiplier". 1.02²⁵ ≈ 1.64× is where the compounding is clearly felt.
 *   Threshold is set close to the in-arc-reachable ceiling of the default
 *   set (several last-rung production milestones and one hidden require
 *   post-arc rates), so crossing ~N-of-reachable lands the perceived peak
 *   of the achievement stack inside the window.
 * - 6: any continuous producer at count ≥ 100 — fifth milestone tier fires
 *   on *some* producer, which is the "bulk-buy rhythm begins" moment.
 *   State-based: doesn't require the bot to hoard primary for a single
 *   getCost(10) affordability check; fires naturally once the bot has
 *   accumulated enough of a mid-tier producer to cross count 100.
 * - 7: top-owned producer's rateChain compounds to ≥1e6× its base. The
 *   archetype-signature "watch the multiplier scroll" moment, scoped to
 *   whichever tier the player is producing on.
 */
export const ARC_BEATS: BeatProbe[] = [
  {
    id: 'beat-1',
    targetWindow: BEAT_WINDOWS['beat-1']!,
    predicate: () => Decimal.gte(getPrimaryResource().value, 1),
  },
  {
    id: 'beat-2',
    targetWindow: BEAT_WINDOWS['beat-2']!,
    predicate: () => producerCountAtLeast('cursor', 1),
  },
  {
    id: 'beat-3',
    targetWindow: BEAT_WINDOWS['beat-3']!,
    predicate: () => producerCountAtLeast('grandma', 1),
  },
  {
    id: 'beat-4',
    targetWindow: BEAT_WINDOWS['beat-4']!,
    predicate: () => upgradeBought('cursor-boost-i'),
  },
  {
    id: 'beat-5',
    targetWindow: BEAT_WINDOWS['beat-5']!,
    predicate: () => achievementsEarnedAtLeast(25),
  },
  {
    id: 'beat-6',
    targetWindow: BEAT_WINDOWS['beat-6']!,
    predicate: () => anyContinuousProducerAtLeast(150),
  },
  {
    id: 'beat-7',
    targetWindow: BEAT_WINDOWS['beat-7']!,
    predicate: () => topProducerHeadlineAtLeast(1e6),
  },
];

// ─── Predicate helpers ────────────────────────────────────────────────────

function producerCountAtLeast(id: string, n: number): boolean {
  const p = getBuildings().getProducer(id);
  return p ? Decimal.gte(p.count.value, n) : false;
}

function upgradeBought(id: string): boolean {
  return getUpgrades().getPurchasable(id)?.active.value ?? false;
}

function achievementsEarnedAtLeast(n: number): boolean {
  return getAchievements().earnedCount.value >= n;
}

/**
 * True when any continuous producer has count ≥ `minCount`. The third
 * milestone tier (count = 25) firing on *some* producer is the "bulk-buy
 * rhythm begins" moment — compound milestone bonuses land on at least one
 * signature producer, and buy-10/buy-max becomes the dominant action for
 * that tier.
 */
function anyContinuousProducerAtLeast(minCount: number): boolean {
  const buildings = getBuildings();
  for (const entry of buildings.getAll()) {
    if (entry.def.trigger !== 'continuous') continue;
    if (Decimal.gte(entry.producer.count.value, minCount)) return true;
  }
  return false;
}

/**
 * Headline multiplier defined as `topOwnedProducer.rateChain.apply(baseRate)
 * / baseRate`. Top-owned = highest-tier continuous producer with count ≥ 1.
 */
function topProducerHeadlineAtLeast(factor: number): boolean {
  const buildings = getBuildings();
  let topEntry: ReturnType<typeof buildings.getAll>[number] | undefined;
  for (const entry of buildings.getAll()) {
    if (entry.def.trigger !== 'continuous') continue;
    if (Decimal.gte(entry.producer.count.value, 1)) topEntry = entry;
  }
  if (!topEntry) return false;

  const base = bn(topEntry.def.baseRate);
  const stacked = bn(topEntry.producer.rateChain.apply(base));
  if (base.lte(0)) return false;
  return stacked.div(base).gte(factor);
}

// Re-export for callers that want to compute the beat 7 headline directly
// (e.g. the regression test pinning the chosen p50).
export {
  topProducerHeadlineAtLeast,
  anyContinuousProducerAtLeast,
  achievementsEarnedAtLeast,
  producerCountAtLeast,
  upgradeBought,
};
