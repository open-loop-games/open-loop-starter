import { Decimal, bn } from 'open-loop-engine';
import { getAchievements, getBuildings, getPrimaryResource, getUpgrades } from '../modules';
import type { ArcBeatProbe, BeatProbe } from '@/balance';

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
export const FLOW_BEATS: BeatProbe[] = Object.keys(BEAT_WINDOWS).map((id) => ({
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
export const ARC_BEATS: ArcBeatProbe[] = [
  {
    id: 'beat-1',
    specWindow: BEAT_WINDOWS['beat-1']!,
    predicate: () => Decimal.gte(getPrimaryResource().value, 1),
  },
  {
    id: 'beat-2',
    specWindow: BEAT_WINDOWS['beat-2']!,
    predicate: () => producerCountAtLeast('cursor', 1),
  },
  {
    id: 'beat-3',
    specWindow: BEAT_WINDOWS['beat-3']!,
    predicate: () => producerCountAtLeast('grandma', 1),
  },
  {
    id: 'beat-4',
    specWindow: BEAT_WINDOWS['beat-4']!,
    predicate: () => upgradeBought('cursor-boost-i'),
  },
  {
    id: 'beat-5',
    specWindow: BEAT_WINDOWS['beat-5']!,
    predicate: () => achievementsEarnedAtLeast(25),
  },
  {
    id: 'beat-6',
    specWindow: BEAT_WINDOWS['beat-6']!,
    predicate: () => anyContinuousProducerAtLeast(150),
  },
  {
    id: 'beat-7',
    specWindow: BEAT_WINDOWS['beat-7']!,
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
