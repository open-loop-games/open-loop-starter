// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Buy.ts
//   Buy.ts:336            coinBuildingCosts: [100, 1000, 2e4, 4e5, 8e6]
//   Buy.ts:26-69          getCostAccelerator + buyAccelerator
//   Buy.ts:156-197        Multiplier shape (parallel structure)
//                         open-loop-research/reference-code/SynergismOfficial/src/Reset.ts
//   Reset.ts:418-433      coin reset baseline (firstOwnedCoin..fifthOwnedCoin
//                         + costs + Accelerator/Multiplier amounts)
// ─────────────────────────────────────────────────────────────────────────────

import type { ProducerDef, CumulativeUpgradeDef } from './types';

// ─── Skeleton ───
// Five coin producers (1st..5th owned coin per canonical naming). Each
// producer's owned-count (= purchasable amount) drives its tick output.
// The cascade in `Synergism.ts:4378-4407` (`upgrades[101..105]`-gated) feeds
// generated tallies between adjacent producers — wired via `extraCount` in
// the coin module, evaluating off until the upgrade band that activates the
// gate buys (later leaf).

export const COIN_PRODUCERS: ProducerDef[] = [
  {
    id: 'coin-1',
    name: 'Worker',
    tier: 'coin',
    position: 1,
    baseRate: 1,
    baseCost: 100,
    costScaling: 4,
  },
  {
    id: 'coin-2',
    name: 'Investment',
    tier: 'coin',
    position: 2,
    baseRate: 1,
    baseCost: 1_000,
    costScaling: 4,
  },
  {
    id: 'coin-3',
    name: 'Printer',
    tier: 'coin',
    position: 3,
    baseRate: 1,
    baseCost: 2e4,
    costScaling: 4,
  },
  {
    id: 'coin-4',
    name: 'Mint',
    tier: 'coin',
    position: 4,
    baseRate: 1,
    baseCost: 4e5,
    costScaling: 4,
  },
  {
    id: 'coin-5',
    name: 'Alchemy',
    tier: 'coin',
    position: 5,
    baseRate: 1,
    baseCost: 8e6,
    costScaling: 4,
  },
];

// ─── Skeleton ───
// Accelerator + Multiplier are cumulative-buy upgrades whose costs follow a
// piecewise super-exponential curve canonical to Synergism. Engine port
// hand-rolls the cost closure with the mirror pattern per
// `purchasable.ts:672-728`. Each grant binds into the appropriate rateChain
// (Accelerator: per-producer rate boost via `acceleratorEffect`; Multiplier:
// global coin multiplier via `multiplierEffect`).

export const ACCELERATOR_DEF: CumulativeUpgradeDef = {
  id: 'accelerator',
  name: 'Accelerator',
  description: 'Boosts production rate of all coin producers.',
  tier: 'coin',
  baseCost: 500,
};

export const MULTIPLIER_DEF: CumulativeUpgradeDef = {
  id: 'multiplier',
  name: 'Multiplier',
  description: 'Multiplies all coin production.',
  tier: 'coin',
  baseCost: 1e4,
};
