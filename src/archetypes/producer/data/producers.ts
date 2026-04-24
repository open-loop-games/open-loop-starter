import type { ProducerDef, ProducerBalance } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Numbers that drive beat timing. Workbench perturbation target. Sim tests
// in `../sim/producer.sim.test.ts` probe these against the § 4 beat map.

export const PRODUCER_BALANCE: ProducerBalance = {
  clickBaseValue: 1,
  tier1BaseRate: 0.1,
  producerCostGrowth: 1.15,
  achievementMultiplier: 1.02,
  milestoneThresholds: [1, 10, 25, 50, 100, 150, 200, 300, 400, 500],
  milestoneBonusPerTier: 3,
  tier1UpgradeMultiplier: 496,
};

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 7 producer tiers + 1 manual click producer. Bakery theme baked inline
// (producer.md § 11 Theme A). Forks override names in place.

export const PRODUCERS: ProducerDef[] = [
  // The click activity — manual trigger, no purchase cost.
  {
    id: 'click',
    name: 'Click',
    trigger: 'manual',
    baseRate: PRODUCER_BALANCE.clickBaseValue,
  },

  // Tier 1 — cursor
  {
    id: 'cursor',
    name: 'Cursor',
    trigger: 'continuous',
    baseRate: 0.1,
    purchase: { baseCost: 46, costScaling: PRODUCER_BALANCE.producerCostGrowth },
  },

  // Tier 2 — grandma
  {
    id: 'grandma',
    name: 'Grandma',
    trigger: 'continuous',
    baseRate: 1,
    purchase: { baseCost: 70, costScaling: PRODUCER_BALANCE.producerCostGrowth },
  },

  // Tier 3 — farm
  {
    id: 'farm',
    name: 'Farm',
    trigger: 'continuous',
    baseRate: 8,
    purchase: { baseCost: 1100, costScaling: PRODUCER_BALANCE.producerCostGrowth },
  },

  // Tier 4 — mine
  {
    id: 'mine',
    name: 'Mine',
    trigger: 'continuous',
    baseRate: 47,
    purchase: { baseCost: 12_000, costScaling: PRODUCER_BALANCE.producerCostGrowth },
  },

  // Tier 5 — factory
  {
    id: 'factory',
    name: 'Factory',
    trigger: 'continuous',
    baseRate: 260,
    purchase: { baseCost: 130_000, costScaling: PRODUCER_BALANCE.producerCostGrowth },
  },

  // Tier 6 — bank
  {
    id: 'bank',
    name: 'Bank',
    trigger: 'continuous',
    baseRate: 1400,
    purchase: { baseCost: 700_000, costScaling: PRODUCER_BALANCE.producerCostGrowth },
  },

  // Tier 7 — temple
  {
    id: 'temple',
    name: 'Temple',
    trigger: 'continuous',
    baseRate: 7800,
    purchase: { baseCost: 5_000_000, costScaling: PRODUCER_BALANCE.producerCostGrowth },
  },
];

export const CONTINUOUS_PRODUCER_IDS = PRODUCERS.filter((p) => p.trigger === 'continuous').map(
  (p) => p.id,
);

export const CLICK_PRODUCER_ID = 'click';
