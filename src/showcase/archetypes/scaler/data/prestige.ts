// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Buy.ts
//   Buy.ts:337             diamondBuildingCosts: [100, 1e5, 1e15, 1e40, 1e100]
//   Buy.ts:657-694         calculateCrystalBuy + buyCrystalUpgrades —
//                          super-exponential cost shape
//                          10^(baseLogCost + costIncrement·((n-0.5)²/2 - 1/8))
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Variables.ts
//   Variables.ts:31        G.crystalUpgradesCost = [6, 15, 20, 40, 100, 200, 500, 1000]
//   Variables.ts:32        G.crystalUpgradeCostIncrement = [8, 15, 20, 40, 100, 200, 500, 1000]
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts
//   Synergism.ts:284-304   firstProduceDiamonds..fifthProduceDiamonds
//                          [0.05, 5e-4, 5e-5, 5e-6, 5e-6] per 0.025s tick → ×40 per sec
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Reset.ts
//   Reset.ts:483-492       prestige reset baseline (firstOwnedDiamonds..fifthOwnedDiamonds
//                          + costs, plus firstGeneratedMythos..fifthGeneratedMythos)
//   Reset.ts:1442+1449     resetUpgrades(2) zeros crystalUpgrades to 0 each prestige
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts
//   Synergism.ts:3206-3247 cascade math + prestigeShards generator
// ─────────────────────────────────────────────────────────────────────────────

import type { ProducerDef, CrystalUpgradeDef } from './types';

// ─── Skeleton ───
// Five diamond producers (1st..5th owned diamonds per canonical naming). Only
// diamond-1 emits to `prestigeShards` directly; diamond-2..5 are cascade-only
// (their tick-rate × dt feeds the next-lower-tier's `*GeneratedDiamonds` ref,
// which loops back as `extraCount` on the lower producer). Prestige module
// wires diamond-2..5 with `trigger: 'manual'` + a sibling `ctx.onTick`
// cascade handler so they don't double-emit prestigeShards.

// ─── Balance ───
// baseRate values lifted from canonical `Synergism.ts:284-304`
// (firstProduceDiamonds..fifthProduceDiamonds), normalized from per-0.025s-tick
// to per-second: ×40. Canonical fifthProduceDiamonds equals fourth (5e-6),
// not a typo — the cascade structure caps at fourth-tier production for
// fifth, with growth above that gated on later-arc upgrades.

export const DIAMOND_PRODUCERS: ProducerDef[] = [
  {
    id: 'diamond-1',
    name: 'Diamond 1',
    tier: 'prestige',
    position: 1,
    baseRate: 2,
    baseCost: 100,
    costScaling: 10,
  },
  {
    id: 'diamond-2',
    name: 'Diamond 2',
    tier: 'prestige',
    position: 2,
    baseRate: 0.02,
    baseCost: 1e5,
    costScaling: 10,
  },
  {
    id: 'diamond-3',
    name: 'Diamond 3',
    tier: 'prestige',
    position: 3,
    baseRate: 0.002,
    baseCost: 1e15,
    costScaling: 10,
  },
  {
    id: 'diamond-4',
    name: 'Diamond 4',
    tier: 'prestige',
    position: 4,
    baseRate: 0.0002,
    baseCost: 1e40,
    costScaling: 10,
  },
  {
    id: 'diamond-5',
    name: 'Diamond 5',
    tier: 'prestige',
    position: 5,
    baseRate: 0.0002,
    baseCost: 1e100,
    costScaling: 10,
  },
];

// ─── Skeleton ───
// 8 Crystal upgrades, canonical positions 1..8. Cost reads `prestigeShards`
// via the closure-cost shape (`createScalingPurchasable.costFormula`, OL-894).
// Crystal levels reset to 0 on every prestige (`Reset.ts:1442+1449`); they are
// the per-cycle micro-loop, distinct from the cumulative-across-prestige
// Upgrades-tab band 21-40.
//
// First-arc port wires the cost shape + level tracking; effects (canonical
// per-row globals — Crystal 1 buffs Workers, Crystal 5 reduces costDivisor,
// etc.) ship inert and graduate as their target rateChain bindings come online.

export const CRYSTAL_UPGRADES: CrystalUpgradeDef[] = [
  {
    id: 'crystal-1',
    position: 1,
    name: 'Crystal Upgrade 1',
    description: 'Increases Worker production. (Inert at first arc.)',
    baseLogCost: 6,
    costIncrement: 8,
  },
  {
    id: 'crystal-2',
    position: 2,
    name: 'Crystal Upgrade 2',
    description: 'Increases Investment production. (Inert at first arc.)',
    baseLogCost: 15,
    costIncrement: 15,
  },
  {
    id: 'crystal-3',
    position: 3,
    name: 'Crystal Upgrade 3',
    description: 'Increases Crystal multiplier. (Inert at first arc.)',
    baseLogCost: 20,
    costIncrement: 20,
  },
  {
    id: 'crystal-4',
    position: 4,
    name: 'Crystal Upgrade 4',
    description: 'Increases Diamond production. (Inert at first arc.)',
    baseLogCost: 40,
    costIncrement: 40,
  },
  {
    id: 'crystal-5',
    position: 5,
    name: 'Crystal Upgrade 5',
    description: 'Reduces all building costs. (Inert at first arc.)',
    baseLogCost: 100,
    costIncrement: 100,
  },
  {
    id: 'crystal-6',
    position: 6,
    name: 'Crystal Upgrade 6',
    description: 'Mythos boost. (Inert at first arc.)',
    baseLogCost: 200,
    costIncrement: 200,
  },
  {
    id: 'crystal-7',
    position: 7,
    name: 'Crystal Upgrade 7',
    description: 'Reduces transcend cost scaling. (Inert at first arc.)',
    baseLogCost: 500,
    costIncrement: 500,
  },
  {
    id: 'crystal-8',
    position: 8,
    name: 'Crystal Upgrade 8',
    description: 'Boosts Crystal 1-7 effectiveness. (Inert at first arc.)',
    baseLogCost: 1000,
    costIncrement: 1000,
  },
];
