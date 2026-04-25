import type { AmbientBalance, AutoProducerDef } from './types';

// ─── Skeleton ───
// 5 continuous tiers. No click-producer entry — Ambient's zero-click
// contract (archetype doc § 9 surface 9) means there is no manual trigger.
// Planter seeds at initialAmount: 1 so beat-1 ("First passive production
// visible") is reachable on cold boot. Other tiers gate on lifetime
// thresholds via `unlocks.ts`.

const COST_SCALING = 1.08;

// ─── Costume ───
// Cozy Farm theme: planter / coop / pond / pasture / orchard.

export const AUTO_PRODUCERS: AutoProducerDef[] = [
  {
    id: 'planter',
    name: 'Planter',
    baseRate: 0.5,
    purchase: { baseCost: 55, costScaling: COST_SCALING, initialAmount: 1 },
  },
  {
    id: 'coop',
    name: 'Coop',
    baseRate: 4,
    purchase: { baseCost: 75, costScaling: COST_SCALING },
  },
  {
    id: 'pond',
    name: 'Pond',
    baseRate: 32,
    purchase: { baseCost: 1_100, costScaling: COST_SCALING },
  },
  {
    id: 'pasture',
    name: 'Pasture',
    baseRate: 220,
    purchase: { baseCost: 18_000, costScaling: COST_SCALING },
  },
  {
    id: 'orchard',
    name: 'Orchard',
    baseRate: 1500,
    purchase: { baseCost: 320_000, costScaling: COST_SCALING },
  },
];

// ─── Balance ───
// Numbers below are first-cut placeholders chosen for ratio shape, not for
// arc-correctness. OL-697's solver re-pins them.

export const AMBIENT_BALANCE: AmbientBalance = {
  tier1BaseRate: 1.0,
  producerCostGrowth: COST_SCALING,
  achievementMultiplier: 1.02,
  offlineEfficiency: 1.0,
  offlineCapHours: 12,
  prestigeEnabled: false,
  prestigeMultiplierBase: 1.2,
  prestigeEligibleThreshold: 1_000_000,
};
