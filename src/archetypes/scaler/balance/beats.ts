import { Decimal, bn, type Engine } from 'open-loop-engine';
import type { ArcBeatProbe, BeatProbe } from '@/balance';
import { ScalerTiersKey, type ScalerTier } from '../modules/tiers';
import type { Tier } from '../data/types';

const sec = (s: number) => s;
const min = (m: number) => m * 60;

/**
 * Beat windows in seconds. One source of truth for both the flow-probe
 * snapshot midpoints and the arc-probe spec windows.
 *
 * Phase ↔ beat mapping per `shape.ts` PRODUCER_PHASES — sub-leaf B's
 * starting estimates from scaler.md § 5 density target. Each window is
 * sub-leaf C/D/E retunable (the calibration call lives there); locks come
 * after discovery converges per BALANCING.md § Theme 5.
 *
 * Initial windows are wide. Sub-leaves C/D/E will tighten once the bot
 * policy stabilizes and the sim shows where each phase lands; the looseness
 * here is by design — sub-leaf B is scaffolding, not calibration.
 */
export const BEAT_WINDOWS: Record<string, [number, number]> = {
  'beat-1': [sec(0), sec(30)], // first antimatter producer bought
  'beat-2': [sec(15), min(2)], // first antimatter upgrade bought
  'beat-3': [min(5), min(20)], // first prestige conversion fires
  'beat-4': [min(6), min(22)], // first Diamond producer bought
  'beat-5': [min(10), min(30)], // first Crystal upgrade bought
  'beat-6': [min(20), min(60)], // first Transcend conversion fires
  'beat-7': [min(22), min(65)], // first Mythos producer bought
  'beat-8': [min(60), min(90)], // cross-tier headline ≥ 1e6×
};

const midpoint = (id: string): number => {
  const [lo, hi] = BEAT_WINDOWS[id]!;
  return Math.round((lo + hi) / 2);
};

/**
 * Snapshot points for the flow-probe — taken at each beat's window midpoint
 * so the per-tier pacing reflects the player's likely state during that
 * beat, not at its earliest or latest possible moment.
 */
export const FLOW_BEATS: BeatProbe[] = Object.keys(BEAT_WINDOWS).map((id) => ({
  id,
  snapshotAtSec: midpoint(id),
  // Predicate is unused for flow snapshots (see runFlowProbe), but the type
  // requires it. Constant `true` keeps the snapshot-at-time semantics intact.
  predicate: () => true,
}));

/**
 * Predicates for arc-probe. Each closes over `engine` and looks up the
 * scaler tiers via injection. Triggers per scaler.md § 5 density target:
 *
 * - 1: first antimatter producer (Worker) owned.
 * - 2: any antimatter upgrade (Accelerator or Multiplier) bought.
 * - 3: prestigePoints ≥ 1 — first prestige conversion fired. The
 *   conversion increments prestigePoints from 0 to floor(log_{1e25}(coins+1)),
 *   which crosses 1 the moment the player first crosses coins ≥ 1e25.
 * - 4: first Diamond producer (Compressor) owned.
 * - 5: any Crystal upgrade bought.
 * - 6: transcendPoints ≥ 1 — first Transcend conversion fired. Same
 *   shape as beat 3.
 * - 7: first Mythos producer bought.
 * - 8: antimatter top-tier producer's rateChain compounds to ≥ 1e6× base —
 *   the cross-tier headline metric reads off the antimatter chain because
 *   per-tier achievements/crystals/challenges all stack onto its rate.
 */
export const ARC_BEATS: ArcBeatProbe[] = [
  {
    id: 'beat-1',
    specWindow: BEAT_WINDOWS['beat-1']!,
    predicate: (engine) => producerCountAtLeast(engine, 'antimatter', 'antimatter-1', 1),
  },
  {
    id: 'beat-2',
    specWindow: BEAT_WINDOWS['beat-2']!,
    predicate: (engine) => anyUpgradeBought(engine, 'antimatter'),
  },
  {
    id: 'beat-3',
    specWindow: BEAT_WINDOWS['beat-3']!,
    predicate: (engine) => currencyAtLeast(engine, 'prestige', 1),
  },
  {
    id: 'beat-4',
    specWindow: BEAT_WINDOWS['beat-4']!,
    predicate: (engine) => producerCountAtLeast(engine, 'prestige', 'prestige-1', 1),
  },
  {
    id: 'beat-5',
    specWindow: BEAT_WINDOWS['beat-5']!,
    predicate: (engine) => anyUpgradeBought(engine, 'prestige'),
  },
  {
    id: 'beat-6',
    specWindow: BEAT_WINDOWS['beat-6']!,
    predicate: (engine) => currencyAtLeast(engine, 'transcend', 1),
  },
  {
    id: 'beat-7',
    specWindow: BEAT_WINDOWS['beat-7']!,
    predicate: (engine) => producerCountAtLeast(engine, 'transcend', 'transcend-1', 1),
  },
  {
    id: 'beat-8',
    specWindow: BEAT_WINDOWS['beat-8']!,
    predicate: (engine) => topAntimatterHeadlineAtLeast(engine, 1e6),
  },
];

// ─── Predicate helpers ────────────────────────────────────────────────────

function getTiers(engine: Engine): ScalerTier[] {
  const tiers = engine.tryInject(ScalerTiersKey);
  if (!tiers) throw new Error('beats: ScalerTiersKey not provided by engine');
  return tiers;
}

function getTier(engine: Engine, id: Tier): ScalerTier {
  const tier = getTiers(engine).find((t) => t.id === id);
  if (!tier) throw new Error(`beats: tier '${id}' missing from ScalerTiersKey`);
  return tier;
}

function producerCountAtLeast(
  engine: Engine,
  tierId: Tier,
  producerId: string,
  n: number,
): boolean {
  const tier = getTier(engine, tierId);
  const p = tier.producers.getProducer(producerId);
  return p ? Decimal.gte(p.count.value, n) : false;
}

function anyUpgradeBought(engine: Engine, tierId: Tier): boolean {
  const tier = getTier(engine, tierId);
  if (!tier.upgrades) return false;
  for (const entry of tier.upgrades.getAll()) {
    if (entry.purchasable.active.value) return true;
  }
  return false;
}

function currencyAtLeast(engine: Engine, tierId: Tier, n: number): boolean {
  return Decimal.gte(getTier(engine, tierId).currency.value, n);
}

/**
 * Headline multiplier read off the highest-position antimatter producer
 * with count ≥ 1. The antimatter chain absorbs achievement + crystal +
 * challenge-completion stacks per scaler.md § 3 stress axis 2 — its
 * compounded factor is the cross-tier readout the player watches.
 *
 * `rateChain.apply(1)` returns the chain's product over a unit input;
 * for the slim-port's pure-multiplicative chain this equals the headline
 * multiplier (M × 1 = M). Forks adding additive-stage grants will need
 * the explicit `chain.apply(baseRate) / baseRate` shape — flag if the
 * chain composition stops being pure-multiplicative.
 */
function topAntimatterHeadlineAtLeast(engine: Engine, factor: number): boolean {
  const tier = getTier(engine, 'antimatter');
  let topEntry: ReturnType<typeof tier.producers.getAll>[number] | undefined;
  for (const entry of tier.producers.getAll()) {
    if (entry.def.tier !== 'antimatter') continue;
    if (Decimal.gte(entry.producer.count.value, 1)) topEntry = entry;
  }
  if (!topEntry) return false;
  const stacked = bn(topEntry.producer.rateChain.apply(1));
  return stacked.gte(factor);
}

export {
  topAntimatterHeadlineAtLeast,
  producerCountAtLeast,
  anyUpgradeBought,
  currencyAtLeast,
  getTier,
  getTiers,
};
