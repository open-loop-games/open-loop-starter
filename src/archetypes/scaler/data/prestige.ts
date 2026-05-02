import type { ProducerDef, CrystalUpgradeDef, PrestigeTierData } from './types';

// ─── Skeleton ────────────────────────────────────────────────────────────────
// 5 prestige producers + 8 crystal upgrades. Synergism slim-port with per-row
// citations to canonical source. Prestige tier costs prestigePoints, produces
// prestigeShards cascading down the diamond ladder. Crystal upgrades apply
// quadratic-cost effects to prestige generation chains.

// ─── Balance ────────────────────────────────────────────────────────────────
// Producer costs and crystal upgrade costs. Prestige run pacing and prestige
// shard generation rates controlled here and in composables/modules.

const PRODUCER_BASE_COSTS = {
  // vanilla canonical: SynergismOfficial/src/Buy.ts:337 — diamondBuildingCosts array
  tier1: 100,
  tier2: '1e5',
  tier3: '1e15',
  tier4: '1e40',
  tier5: '1e100',
} as const;

const CRYSTAL_BASE_LOG_COSTS = [
  // vanilla canonical: SynergismOfficial/src/Synergism.ts:544 — crystalUpgradesCost array
  // Note: Synergism uses log10(prestigeShards) as the cost base; these are the exponents.
  7, 15, 20, 40, 100, 200, 500, 1000,
] as const;

const CRYSTAL_COST_INCREMENTS = [
  // vanilla canonical: SynergismOfficial/src/Variables.ts:32 — crystalUpgradeCostIncrement array
  // Quadratic scaling coefficient per crystal upgrade level.
  8, 15, 20, 40, 100, 200, 500, 1000,
] as const;

// ─── Skeleton + Costume ─────────────────────────────────────────────────────

/**
 * Five prestige-tier producers (Diamonds). Each costs prestigePoints to unlock;
 * each produces prestigeShards that feed the prestige cascade. Synergism carries
 * these across transcension resets (see Reset.ts:482–499); starter models them
 * as 5 parallel producers cascading into a prestige resource pool.
 */
export const PRESTIGE: PrestigeTierData = {
  producers: [
    {
      id: 'prestige-1',
      name: 'Compressor',
      tier: 'prestige',
      position: 1,
      // vanilla canonical: SynergismOfficial/src/Buy.ts:337 — diamondBuildingCosts[0]
      baseCost: PRODUCER_BASE_COSTS.tier1,
    },
    {
      id: 'prestige-2',
      name: 'Stellar Forge',
      tier: 'prestige',
      position: 2,
      // vanilla canonical: SynergismOfficial/src/Buy.ts:337 — diamondBuildingCosts[1]
      baseCost: PRODUCER_BASE_COSTS.tier2,
    },
    {
      id: 'prestige-3',
      name: 'Galactic Furnace',
      tier: 'prestige',
      position: 3,
      // vanilla canonical: SynergismOfficial/src/Buy.ts:337 — diamondBuildingCosts[2]
      baseCost: PRODUCER_BASE_COSTS.tier3,
    },
    {
      id: 'prestige-4',
      name: 'Cluster Engine',
      tier: 'prestige',
      position: 4,
      // vanilla canonical: SynergismOfficial/src/Buy.ts:337 — diamondBuildingCosts[3]
      baseCost: PRODUCER_BASE_COSTS.tier4,
    },
    {
      id: 'prestige-5',
      name: 'Cosmic Conduit',
      tier: 'prestige',
      position: 5,
      // vanilla canonical: SynergismOfficial/src/Buy.ts:337 — diamondBuildingCosts[4]
      baseCost: PRODUCER_BASE_COSTS.tier5,
    },
  ] as ProducerDef[],

  crystalUpgrades: [
    {
      id: 'crystal-1',
      name: 'Crystal I',
      description: 'Amplifies achievement point contribution to prestige generation.',
      position: 1,
      // vanilla canonical: SynergismOfficial/src/Synergism.ts:544 — crystalUpgradesCost[0]
      baseLogCost: CRYSTAL_BASE_LOG_COSTS[0],
      // vanilla canonical: SynergismOfficial/src/Variables.ts:32 — crystalUpgradeCostIncrement[0]
      costIncrement: CRYSTAL_COST_INCREMENTS[0],
    },
    {
      id: 'crystal-2',
      name: 'Crystal II',
      description: 'Scales production based on log10(coins). Effect compounds with upgrade level.',
      position: 2,
      // vanilla canonical: SynergismOfficial/src/Synergism.ts:544 — crystalUpgradesCost[1]
      baseLogCost: CRYSTAL_BASE_LOG_COSTS[1],
      // vanilla canonical: SynergismOfficial/src/Variables.ts:32 — crystalUpgradeCostIncrement[1]
      costIncrement: CRYSTAL_COST_INCREMENTS[1],
    },
    {
      id: 'crystal-3',
      name: 'Crystal III',
      description: 'Increases prestige tier crystal multiplier. Affects final shard scaling.',
      position: 3,
      // vanilla canonical: SynergismOfficial/src/Synergism.ts:544 — crystalUpgradesCost[2]
      baseLogCost: CRYSTAL_BASE_LOG_COSTS[2],
      // vanilla canonical: SynergismOfficial/src/Variables.ts:32 — crystalUpgradeCostIncrement[2]
      costIncrement: CRYSTAL_COST_INCREMENTS[2],
    },
    {
      id: 'crystal-4',
      name: 'Crystal IV',
      description: 'Boosts max exponent cap. Effect scales with upgrade count.',
      position: 4,
      // vanilla canonical: SynergismOfficial/src/Synergism.ts:544 — crystalUpgradesCost[3]
      baseLogCost: CRYSTAL_BASE_LOG_COSTS[3],
      // vanilla canonical: SynergismOfficial/src/Variables.ts:32 — crystalUpgradeCostIncrement[3]
      costIncrement: CRYSTAL_COST_INCREMENTS[3],
    },
    {
      id: 'crystal-5',
      name: 'Crystal V',
      description: 'Grants multiplicative bonus scaling with challenge completions.',
      position: 5,
      // vanilla canonical: SynergismOfficial/src/Synergism.ts:544 — crystalUpgradesCost[4]
      baseLogCost: CRYSTAL_BASE_LOG_COSTS[4],
      // vanilla canonical: SynergismOfficial/src/Variables.ts:32 — crystalUpgradeCostIncrement[4]
      costIncrement: CRYSTAL_COST_INCREMENTS[4],
    },
    {
      id: 'crystal-6',
      name: 'Crystal VI',
      description: 'Quadratic-cost prestige upgrade. Effect compounds against crystal level.',
      position: 6,
      // vanilla canonical: SynergismOfficial/src/Synergism.ts:544 — crystalUpgradesCost[5]
      baseLogCost: CRYSTAL_BASE_LOG_COSTS[5],
      // vanilla canonical: SynergismOfficial/src/Variables.ts:32 — crystalUpgradeCostIncrement[5]
      costIncrement: CRYSTAL_COST_INCREMENTS[5],
    },
    {
      id: 'crystal-7',
      name: 'Crystal VII',
      description: 'Quadratic-cost prestige upgrade. Effect compounds against crystal level.',
      position: 7,
      // vanilla canonical: SynergismOfficial/src/Synergism.ts:544 — crystalUpgradesCost[6]
      baseLogCost: CRYSTAL_BASE_LOG_COSTS[6],
      // vanilla canonical: SynergismOfficial/src/Variables.ts:32 — crystalUpgradeCostIncrement[6]
      costIncrement: CRYSTAL_COST_INCREMENTS[6],
    },
    {
      id: 'crystal-8',
      name: 'Crystal VIII',
      description: 'Quadratic-cost prestige upgrade. Effect compounds against crystal level.',
      position: 8,
      // vanilla canonical: SynergismOfficial/src/Synergism.ts:544 — crystalUpgradesCost[7]
      baseLogCost: CRYSTAL_BASE_LOG_COSTS[7],
      // vanilla canonical: SynergismOfficial/src/Variables.ts:32 — crystalUpgradeCostIncrement[7]
      costIncrement: CRYSTAL_COST_INCREMENTS[7],
    },
  ] as CrystalUpgradeDef[],
};
