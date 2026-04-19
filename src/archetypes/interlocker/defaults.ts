/**
 * Interlocker archetype — default vars.
 *
 * Baseline values a fresh Interlocker-archetype game starts with. Mirrors
 * the defaults called out in archetypes/interlocker.md § 5 and the
 * content sketch in § 8. Balance baseline tuned to the 1–2h first-
 * completion arc: first conversion chain closed around beat 2 (~5 min),
 * first bottleneck at beat 3 (~15 min), first synergy at beat 4 (~30
 * min), tech-tree opened at beat 5 (~50 min), T2 resource at beat 6
 * (~75 min), arc closure at beat 8 (~110 min).
 *
 * Defaults lean on the Kittens Game shape (3 resource tiers, 8 total
 * resources, 9 buildings, 4 recipes, 6 synergies, 4 tech gates) as the
 * most-validated Interlocker composition in the research corpus. Forks
 * that want a wider graph extend `resourcesPerTier` / `recipes` /
 * `synergies` and retune via `pnpm validate:archetypes` + the § 6
 * probe set.
 */
import type {
  InterlockerArchetypeVars,
  InterlockerBalanceVars,
  InterlockerThemeVars,
  InterlockerVars,
} from './types';

export const DEFAULT_INTERLOCKER_ARCHETYPE_VARS: InterlockerArchetypeVars = {
  resourceTierCount: 3,
  resourcesPerTier: [3, 3, 2],
  buildingCountPerTier: [3, 4, 2],
  conversionChainCount: 4,
  synergyCount: 6,
  techGateCount: 4,
  achievementCount: 24,
  allowNegativeRates: true,
  arcClosureGraphCompletenessPolicy: 'both',
};

export const DEFAULT_INTERLOCKER_BALANCE_VARS: InterlockerBalanceVars = {
  buildingCostScaling: {
    baseCost: {
      'raw-0': '10',
      'raw-1': '10',
      'raw-2': '15',
      'basic-0': '50',
      'basic-1': '60',
      'basic-2': '80',
      'advanced-0': '500',
      'advanced-1': '750',
    },
    perPurchaseGrowth: 1.1,
  },
  recipes: [
    {
      id: 'recipe-raw-0-to-basic-0',
      buildingId: 'building-basic-0',
      inputs: { 'raw-0': '1', 'raw-1': '0.5' },
      outputs: { 'basic-0': '0.5' },
      unlockedByTech: null,
    },
    {
      id: 'recipe-raw-to-basic-1',
      buildingId: 'building-basic-1',
      inputs: { 'raw-1': '1', 'raw-2': '0.5' },
      outputs: { 'basic-1': '0.4' },
      unlockedByTech: 'tech-basic-unlock',
    },
    {
      id: 'recipe-basic-to-advanced-0',
      buildingId: 'building-advanced-0',
      inputs: { 'basic-0': '0.5', 'basic-1': '0.5' },
      outputs: { 'advanced-0': '0.1' },
      unlockedByTech: 'tech-advanced-unlock',
    },
    {
      id: 'recipe-basic-to-advanced-1',
      buildingId: 'building-advanced-1',
      inputs: { 'basic-1': '0.3', 'basic-2': '0.3' },
      outputs: { 'advanced-1': '0.08' },
      unlockedByTech: 'tech-advanced-unlock',
    },
  ],
  synergies: [
    {
      id: 'synergy-workshop-lumber',
      sourceBuildingId: 'building-basic-2',
      targetResourceId: 'basic-0',
      effect: 'multiplicative',
      perSourceUnitMagnitude: 0.01,
      cap: 0.5,
    },
    {
      id: 'synergy-workshop-iron',
      sourceBuildingId: 'building-basic-2',
      targetResourceId: 'basic-1',
      effect: 'multiplicative',
      perSourceUnitMagnitude: 0.01,
      cap: 0.5,
    },
    {
      id: 'synergy-library-science',
      sourceBuildingId: 'building-advanced-1',
      targetResourceId: 'advanced-1',
      effect: 'multiplicative',
      perSourceUnitMagnitude: 0.02,
      cap: 1.0,
    },
    {
      id: 'synergy-smelter-machines',
      sourceBuildingId: 'building-basic-1',
      targetResourceId: 'advanced-0',
      effect: 'multiplicative',
      perSourceUnitMagnitude: 0.015,
      cap: 0.75,
    },
    {
      id: 'synergy-raw-minerals-advanced-0',
      sourceBuildingId: 'building-raw-2',
      targetResourceId: 'advanced-0',
      effect: 'additive',
      perSourceUnitMagnitude: 0.005,
      cap: 0.25,
    },
    {
      id: 'synergy-raw-wood-basic-0',
      sourceBuildingId: 'building-raw-1',
      targetResourceId: 'basic-0',
      effect: 'additive',
      perSourceUnitMagnitude: 0.005,
      cap: 0.25,
    },
  ],
  techCosts: [
    {
      techId: 'tech-basic-unlock',
      requires: { 'raw-0': '100', 'raw-1': '50' },
      unlocksTier: 1,
    },
    {
      techId: 'tech-synergy-workshop',
      requires: { 'basic-0': '50', 'basic-1': '25' },
      unlocksTier: 1,
    },
    {
      techId: 'tech-advanced-unlock',
      requires: { 'basic-0': '200', 'basic-1': '150', 'basic-2': '100' },
      unlocksTier: 2,
    },
    {
      techId: 'tech-synergy-cross-tier',
      requires: { 'basic-2': '250', 'advanced-0': '20' },
      unlocksTier: 2,
    },
  ],
  achievementMultiplier: 1.03,
  graphCompletenessAchievementThreshold: 1.0,
};

/**
 * Reference theme — neutral naming for the stubbed skeleton. Real games
 * override wholesale. Array lengths match the archetype vars (3 tiers,
 * 8 resources total, 9 buildings, 4 techs).
 */
export const DEFAULT_INTERLOCKER_THEME_VARS: InterlockerThemeVars = {
  resourceNames: [
    [
      { singular: 'raw-0', plural: 'raw-0' },
      { singular: 'raw-1', plural: 'raw-1' },
      { singular: 'raw-2', plural: 'raw-2' },
    ],
    [
      { singular: 'basic-0', plural: 'basic-0' },
      { singular: 'basic-1', plural: 'basic-1' },
      { singular: 'basic-2', plural: 'basic-2' },
    ],
    [
      { singular: 'advanced-0', plural: 'advanced-0' },
      { singular: 'advanced-1', plural: 'advanced-1' },
    ],
  ],
  buildingNames: [
    'building-raw-0',
    'building-raw-1',
    'building-raw-2',
    'building-basic-0',
    'building-basic-1',
    'building-basic-2',
    'building-basic-3',
    'building-advanced-0',
    'building-advanced-1',
  ],
  techNames: [
    'tech-basic-unlock',
    'tech-synergy-workshop',
    'tech-advanced-unlock',
    'tech-synergy-cross-tier',
  ],
  synergyFlavour: [],
  recipeFlavour: [],
  achievementFlavour: [],
  endOfArcMessage: 'Arc complete.',
};

export const DEFAULT_INTERLOCKER_VARS: InterlockerVars = {
  archetype: DEFAULT_INTERLOCKER_ARCHETYPE_VARS,
  theme: DEFAULT_INTERLOCKER_THEME_VARS,
  balance: DEFAULT_INTERLOCKER_BALANCE_VARS,
};
