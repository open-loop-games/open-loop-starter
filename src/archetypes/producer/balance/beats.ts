import { Decimal, type Engine } from 'open-loop-engine';
import {
  AchievementsKey,
  ArcKey,
  BuildingsKey,
  HeadlineRateKey,
  PrimaryResourceKey,
  ProducerDataKey,
  UpgradesKey,
} from '../modules';
import type { ArcBeatProbe, BeatProbe } from '@/balance';

const sec = (s: number) => s;
const min = (m: number) => m * 60;

/**
 * § 4 windows in seconds. One source of truth for both the flow-probe
 * snapshot midpoints and the arc-probe spec windows.
 */
export const BEAT_WINDOWS: Record<string, [number, number]> = {
  'beat-1': [sec(0), sec(30)],
  'beat-2': [min(1), min(3)],
  'beat-3': [min(5), min(10)],
  'beat-4': [min(12), min(20)],
  'beat-5': [min(25), min(40)],
  'beat-6': [min(40), min(65)],
  'beat-7': [min(65), min(95)],
  'beat-8': [min(95), min(120)],
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
 * Predicates for arc-probe. § 4 triggers, decoded:
 *
 * - 1: primary resource ≥ 1 (first click registers).
 * - 2: cursor (tier 1) owned.
 * - 3: grandma (tier 2) owned.
 * - 4: first per-producer upgrade bought (cursor-boost-i is cheapest in current data).
 * - 5: ≥5 achievements earned. § 4 says "first achievement-driven
 *   multiplier" — but every achievement currently grants the default
 *   1.02× headline, so the first one (`First Crumb`, fires on lifetime ≥ 1)
 *   triggers in seconds. The *perceptible* multiplier moment is when
 *   the stack starts compounding visibly; 5 is where 1.02⁵ ≈ 1.10× lifts
 *   the headline noticeably.
 * - 6: bulk-buy meaningful — at least one owned producer's
 *   `calculateMaxAffordable ≥ 10`, i.e. the player could now click
 *   "Buy 10" and have it land. Stresses formula inversion under load.
 * - 7: top-owned producer's rateChain compounds to ≥1e6× its base. The
 *   archetype-signature "watch the multiplier scroll" moment, scoped to
 *   whichever tier the player is producing on.
 * - 8: `ArcKey.complete` — every continuous producer owned ≥1 AND every
 *   global upgrade bought. Wired in `modules/arc.ts`.
 */
export const ARC_BEATS: ArcBeatProbe[] = [
  {
    id: 'beat-1',
    specWindow: BEAT_WINDOWS['beat-1']!,
    predicate: (engine) => {
      const primary = engine.tryInject(PrimaryResourceKey);
      return primary ? Decimal.gte(primary.value, 1) : false;
    },
  },
  {
    id: 'beat-2',
    specWindow: BEAT_WINDOWS['beat-2']!,
    predicate: (engine) => producerCountAtLeast(engine, 'cursor', 1),
  },
  {
    id: 'beat-3',
    specWindow: BEAT_WINDOWS['beat-3']!,
    predicate: (engine) => producerCountAtLeast(engine, 'grandma', 1),
  },
  {
    id: 'beat-4',
    specWindow: BEAT_WINDOWS['beat-4']!,
    predicate: (engine) => upgradeBought(engine, 'cursor-boost-i'),
  },
  {
    id: 'beat-5',
    specWindow: BEAT_WINDOWS['beat-5']!,
    predicate: (engine) => achievementsEarnedAtLeast(engine, 5),
  },
  {
    id: 'beat-6',
    specWindow: BEAT_WINDOWS['beat-6']!,
    predicate: (engine) => bulkBuyMeaningful(engine, 10),
  },
  {
    id: 'beat-7',
    specWindow: BEAT_WINDOWS['beat-7']!,
    predicate: (engine) => topProducerHeadlineAtLeast(engine, 1e6),
  },
  {
    id: 'beat-8',
    specWindow: BEAT_WINDOWS['beat-8']!,
    predicate: (engine) => arcComplete(engine),
  },
];

// ─── Predicate helpers ────────────────────────────────────────────────────

function producerCountAtLeast(engine: Engine, id: string, n: number): boolean {
  const buildings = engine.tryInject(BuildingsKey);
  const p = buildings?.getProducer(id);
  return p ? Decimal.gte(p.count.value, n) : false;
}

function upgradeBought(engine: Engine, id: string): boolean {
  const upgrades = engine.tryInject(UpgradesKey);
  return upgrades?.getPurchasable(id)?.bought.value ?? false;
}

function achievementsEarnedAtLeast(engine: Engine, n: number): boolean {
  const a = engine.tryInject(AchievementsKey);
  return (a?.earnedCount.value ?? 0) >= n;
}

/**
 * True when at least one owned continuous producer has a `getCost(10)` the
 * player can afford. The "buy 10" affordance is what beat 6 codifies.
 */
function bulkBuyMeaningful(engine: Engine, bulk: number): boolean {
  const buildings = engine.tryInject(BuildingsKey);
  const primary = engine.tryInject(PrimaryResourceKey);
  const data = engine.tryInject(ProducerDataKey);
  if (!buildings || !primary || !data) return false;

  for (const def of data.producers) {
    if (def.trigger !== 'continuous') continue;
    const p = buildings.getProducer(def.id);
    if (!p?.repeatable) continue;
    if (Decimal.lt(p.count.value, 1)) continue;
    const cost10 = p.repeatable.getCost(bulk);
    if (Decimal.gte(primary.value, cost10)) return true;
  }
  return false;
}

/**
 * Headline multiplier defined as `topOwnedProducer.rateChain.apply(baseRate)
 * / baseRate`. Top-owned = highest-tier continuous producer with count ≥ 1.
 */
function topProducerHeadlineAtLeast(engine: Engine, factor: number): boolean {
  const buildings = engine.tryInject(BuildingsKey);
  const data = engine.tryInject(ProducerDataKey);
  if (!buildings || !data) return false;

  let topDef: (typeof data.producers)[number] | undefined;
  for (const def of data.producers) {
    if (def.trigger !== 'continuous') continue;
    const p = buildings.getProducer(def.id);
    if (p && Decimal.gte(p.count.value, 1)) topDef = def;
  }
  if (!topDef) return false;

  const top = buildings.getProducer(topDef.id)!;
  const base = new Decimal(topDef.baseRate);
  const stacked = new Decimal(top.rateChain.apply(base));
  if (base.lte(0)) return false;
  return stacked.div(base).gte(factor);
}

function arcComplete(engine: Engine): boolean {
  const arc = engine.tryInject(ArcKey);
  return arc?.complete.value ?? false;
}

// Re-export for callers that want to compute the beat 7 headline directly
// (e.g. the regression test pinning the chosen p50).
export {
  topProducerHeadlineAtLeast,
  bulkBuyMeaningful,
  achievementsEarnedAtLeast,
  producerCountAtLeast,
  upgradeBought,
  arcComplete,
};

// HeadlineRateKey is re-imported above only to keep it in the module's
// import surface for downstream consumers that want the live rate ref;
// the predicates themselves go through rateChain.apply for explicitness.
void HeadlineRateKey;
