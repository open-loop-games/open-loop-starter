/**
 * Explorer archetype — default vars.
 *
 * Baseline values a fresh Explorer-archetype game starts with. Mirrors
 * the defaults called out in archetypes/explorer.md § 5 and the content
 * sketch in § 8. Balance baseline tuned to the 1–2h first-completion
 * arc: first sector revealed within 2 min, first camp built by ~15 min,
 * first equipment by ~25 min, zone-1 full coverage by ~65 min, cross-
 * zone transition by ~80 min, territory-charted milestone at ~110 min.
 *
 * Defaults lean on the Level 13 shape (5 core resources, 4 zones of
 * increasing sector density, typed-fungible inventory, solo avatar)
 * as the most-validated pure-Explorer composition in the research
 * corpus. Cavernous-II-shape forks add a loop-reset wrapper; Trimps-
 * spatial-slice forks add combat; either is a fork-level commitment
 * beyond the skeleton.
 */
import type {
  ExplorerArchetypeVars,
  ExplorerBalanceVars,
  ExplorerThemeVars,
  ExplorerVars,
} from './types';

export const DEFAULT_EXPLORER_ARCHETYPE_VARS: ExplorerArchetypeVars = {
  zoneCount: 4,
  sectorsPerZone: [12, 16, 20, 24],
  adjacencyTopology: 'grid-4',
  fogOfWarEnabled: true,
  seedBasedWorld: false,

  itemIdentityMode: 'typed-fungible',
  baseBagCapacity: 5,
  equipmentSlotCount: 3,

  partySize: 1,
  companionsEnabled: false,

  coreResourceCount: 5,
  consumableResourceCount: 2,
};

export const DEFAULT_EXPLORER_BALANCE_VARS: ExplorerBalanceVars = {
  actionCosts: {
    scout: {
      duration: 5,
      costs: { food: '0.2', water: '0.3' },
    },
    scavenge: {
      duration: 10,
      costs: { food: '0.3', water: '0.4' },
      yield: { metal: '1', rope: '0.3', concrete: '0.2' },
    },
    investigate: {
      duration: 20,
      costs: { food: '0.5', water: '0.5' },
    },
    clearWaste: {
      duration: 60,
      costs: { food: '1.5', water: '1.5', metal: '2' },
    },
  },

  zoneUnlockThresholds: [
    { zone: 2, requires: 'exploration-fraction', value: 0.8 },
    { zone: 3, requires: 'landmark-investigated', value: 2 },
    { zone: 4, requires: 'equipment-acquired', value: 'rebreather' },
  ],

  itemDropRates: {
    perScavengeBaseRate: 0.08,
    perSectorFirstScavengeBonus: 0.4,
    rarityDistribution: {
      common: 0.7,
      uncommon: 0.2,
      rare: 0.08,
      legendary: 0.02,
    },
  },

  bagCapacityUpgradeSteps: [5, 8, 12, 18, 25],
  bagCapacityUpgradeCosts: [
    { metal: '15', rope: '5' },
    { metal: '40', rope: '15', concrete: '5' },
    { metal: '100', rope: '40', concrete: '20' },
    { metal: '250', rope: '100', concrete: '60' },
  ],

  scoutRevealRadius: 1,
  fogRevealDecayPerSector: 1.02,

  campConstructionCost: { metal: '20', rope: '10', concrete: '5' },
  equipmentCraftingCosts: [
    { id: 'knife', slot: 'weapon', requires: { metal: '10', rope: '2' } },
    { id: 'torch', slot: 'tool', requires: { metal: '5', rope: '3', concrete: '1' } },
    { id: 'coat', slot: 'warmth-garment', requires: { rope: '8', metal: '3' } },
    { id: 'rebreather', slot: 'tool', requires: { metal: '40', rope: '10', concrete: '15' } },
    { id: 'climbing-rope', slot: 'tool', requires: { rope: '25', metal: '5' } },
  ],

  territoryChartedThreshold: 0.35,
  achievementMultiplier: 1.02,
};

/**
 * Reference theme — neutral naming for the stubbed skeleton. Real
 * games override wholesale. Array lengths match the archetype vars
 * (4 zones, 5 resources).
 */
export const DEFAULT_EXPLORER_THEME_VARS: ExplorerThemeVars = {
  zoneNames: [
    { singular: 'surface', plural: 'surface', flavour: 'Open-air sectors near the starting camp.' },
    { singular: 'underground', plural: 'underground', flavour: 'Low-light tunnels below the surface.' },
    { singular: 'ruins', plural: 'ruins', flavour: 'Collapsed structures with buried caches.' },
    { singular: 'deep', plural: 'deep', flavour: 'The furthest reaches; requires full equipment.' },
  ],
  resourceNames: [
    { singular: 'food', plural: 'food' },
    { singular: 'water', plural: 'water' },
    { singular: 'metal', plural: 'metal' },
    { singular: 'rope', plural: 'rope' },
    { singular: 'concrete', plural: 'concrete' },
  ],
  avatarName: 'Explorer',
  mapStyleHint: 'tile-iconic',
  landmarkFlavour: [],
  equipmentFlavour: [],
  endOfArcMessage: 'Arc complete.',
};

export const DEFAULT_EXPLORER_VARS: ExplorerVars = {
  archetype: DEFAULT_EXPLORER_ARCHETYPE_VARS,
  theme: DEFAULT_EXPLORER_THEME_VARS,
  balance: DEFAULT_EXPLORER_BALANCE_VARS,
};
