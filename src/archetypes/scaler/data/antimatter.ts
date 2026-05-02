import type { AntimatterTierData, ProducerDef, AntimatterUpgradeDef } from './types';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// 5 coin producers + 2 cumulative upgrades (Accelerator, Multiplier).
// Synergism Antimatter tier slim-port. Names are placeholder costume; forks
// override in place. Production follows cascading order: tier-5 feeds tier-4,
// tier-4 feeds tier-3, etc. Each producer's baseRate is tuned per the balance
// lens below; cost growth is handled by cumulative-buy cost formulas in the
// modules layer.

// ─── Balance ───────────────────────────────────────────────────────────────
// Antimatter tier baseline: 5 producers at fixed costs, 2 upgrades
// (Accelerator + Multiplier) with quadratic cumulative-buy formulas.
// Synergism's getCostAccelerator (Buy.ts:26) and getCostMultiplier
// (Buy.ts:156) drive cost scaling per buy count; scaler modules will
// replicate those formulas. This data layer only holds the initial baseCosts.

const producers: ProducerDef[] = [
  {
    id: 'antimatter-1',
    name: 'Worker',
    tier: 'antimatter',
    position: 1,
    // vanilla canonical: SynergismOfficial/src/Buy.ts:336 — coinBuildingCosts[0]
    baseCost: 100,
  },
  {
    id: 'antimatter-2',
    name: 'Mine',
    tier: 'antimatter',
    position: 2,
    // vanilla canonical: SynergismOfficial/src/Buy.ts:336 — coinBuildingCosts[1]
    baseCost: 1000,
  },
  {
    id: 'antimatter-3',
    name: 'Shipyard',
    tier: 'antimatter',
    position: 3,
    // vanilla canonical: SynergismOfficial/src/Buy.ts:336 — coinBuildingCosts[2]
    baseCost: '2e4',
  },
  {
    id: 'antimatter-4',
    name: 'Manufactory',
    tier: 'antimatter',
    position: 4,
    // vanilla canonical: SynergismOfficial/src/Buy.ts:336 — coinBuildingCosts[3]
    baseCost: '4e5',
  },
  {
    id: 'antimatter-5',
    name: 'Refinery',
    tier: 'antimatter',
    position: 5,
    // vanilla canonical: SynergismOfficial/src/Buy.ts:336 — coinBuildingCosts[4]
    baseCost: '8e6',
  },
];

const upgrades: AntimatterUpgradeDef[] = [
  {
    id: 'accelerator',
    name: 'Accelerator',
    description:
      'Cumulative buy: each Accelerator boosts coin production scaling. Cost grows quadratically.',
    // vanilla canonical: SynergismOfficial/src/Reset.ts:432 — player.acceleratorCost
    baseCost: 500,
  },
  {
    id: 'multiplier',
    name: 'Multiplier',
    description: 'Cumulative buy: each Multiplier doubles coin production at threshold milestones.',
    // vanilla canonical: SynergismOfficial/src/Reset.ts:430 — player.multiplierCost
    baseCost: '1e4',
  },
];

// ─── Costume ───────────────────────────────────────────────────────────────
// Producer names (Worker, Mine, Shipyard, Manufactory, Refinery) are
// placeholder slot fillers. Forks override in place per their theme.
// Upgrade names and descriptions are canonical.

export const ANTIMATTER: AntimatterTierData = {
  producers,
  upgrades,
};
