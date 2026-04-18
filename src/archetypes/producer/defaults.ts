/**
 * Producer archetype — default vars.
 *
 * Baseline values a fresh Producer-archetype game starts with. Mirrors the
 * defaults called out in archetypes/producer.md § 5. Codegen (pending)
 * emits a game's vars/*.ts by snapshotting these and writing them into
 * src/modules/mods/<game>/vars/ — each game owns a copy it can tune.
 *
 * Theme defaults are deliberately neutral (reference-only); a real game
 * ships its own theme under src/modules/mods/<game>/vars/theme.ts.
 */
import type {
  ProducerArchetypeVars,
  ProducerBalanceVars,
  ProducerThemeVars,
  ProducerVars,
} from './types';

export const DEFAULT_PRODUCER_ARCHETYPE_VARS: ProducerArchetypeVars = {
  producerTierCount: 7,
  upgradesPerProducer: 3,
  globalUpgradeCount: 6,
  achievementCount: 30,
  bulkBuyEnabled: true,
  softCapClickContributionAt: null,
};

export const DEFAULT_PRODUCER_BALANCE_VARS: ProducerBalanceVars = {
  clickBaseValue: '1',
  tier1BaseRate: '0.1',
  tierCostRatios: [1, 10, 8, 6, 5, 5, 5],
  producerCostScaling: {
    baseCost: '15',
    growth: 1.15,
  },
  upgradeMultiplier: 2,
  globalUpgradeMultiplier: 2,
  achievementMultiplier: 1.02,
  milestoneThresholds: [1, 10, 25, 50, 100, 150, 200, 300, 400, 500],
  milestoneBonusPerTier: 2,
};

/**
 * Reference theme — neutral naming, suitable for a stubbed game skeleton.
 * Real games override wholesale. Producer-names length matches
 * DEFAULT_PRODUCER_ARCHETYPE_VARS.producerTierCount (7).
 */
export const DEFAULT_PRODUCER_THEME_VARS: ProducerThemeVars = {
  resourceName: { singular: 'unit', plural: 'units' },
  producerNames: ['t1', 't2', 't3', 't4', 't5', 't6', 't7'],
  upgradeFlavour: [],
  achievementFlavour: [],
  clickButtonLabel: 'Produce',
  endOfArcMessage: 'Arc complete.',
};

export const DEFAULT_PRODUCER_VARS: ProducerVars = {
  archetype: DEFAULT_PRODUCER_ARCHETYPE_VARS,
  theme: DEFAULT_PRODUCER_THEME_VARS,
  balance: DEFAULT_PRODUCER_BALANCE_VARS,
};
