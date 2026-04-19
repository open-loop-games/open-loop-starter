/**
 * Director archetype — default vars.
 *
 * Baseline values a fresh Director-archetype game starts with. Mirrors the
 * defaults called out in archetypes/director.md § 5. Codegen (pending)
 * emits a game's vars/*.ts by snapshotting these and writing them into
 * src/modules/mods/<game>/vars/ — each game owns a copy it can tune.
 *
 * Theme defaults are deliberately neutral (reference-only); a real game
 * ships its own theme under src/modules/mods/<game>/vars/theme.ts.
 */
import type {
  DirectorArchetypeVars,
  DirectorBalanceVars,
  DirectorThemeVars,
  DirectorVars,
} from './types';

export const DEFAULT_DIRECTOR_ARCHETYPE_VARS: DirectorArchetypeVars = {
  mapWidth: 100,
  mapHeight: 100,
  factionCount: 4,
  symmetry: 'rotational-4fold',

  roundLengthSec: 300,
  slowStartDelaySec: 15,
  endOfRoundCountdownSec: 30,

  nearHotspotsPerFaction: 1,
  naturalHotspotsPerFaction: 1,
  contestedHotspots: 4,
  centerHotspots: 1,

  flowFieldEnabled: true,
  flowCouplesToSpread: true,
  flowCouplesToCombat: true,

  startingGoalSlots: 1,
  maxGoalSlots: 5,

  playerFaction: 'red',

  spreadLoopHz: 1,
  combatLoopHz: 1,
  aiPickerHz: 0.25,
};

export const DEFAULT_DIRECTOR_BALANCE_VARS: DirectorBalanceVars = {
  baseHp: '100',
  baseAttack: '10',
  baseDefense: '5',

  hotspotBaseYield: 1,
  hotspotCapacity: 1000,
  // 10% of capacity per minute — base extraction outpaces steady-state regen
  // at a full hotspot, forcing factions to rotate claims (OL-510 spec).
  hotspotRegenPerSec: 0.1 / 60,
  nearHotspotYieldMul: 0.5,
  naturalHotspotYieldMul: 1.0,
  contestedHotspotYieldMul: 1.5,
  centerHotspotYieldMul: 2.0,

  goalMultiplier: '1.5',

  essenceUpgradeCostScaling: 1.6,
  essenceUpgradePerLevel: 0.25,
  essenceUpgradeMaxLevel: 10,

  metaCurrencyPerCell: 0.05,
  metaCurrencyPerHotspot: 5,

  metaUpgradePerLevel: 0.2,
  metaUpgradeMaxLevel: 20,

  spreadBaseRatePerSec: 2,
  spreadTerrainMul: {
    rock: 0,
    open: 1,
    spawn: 1,
    hotspot: 1,
  },

  // Primary feel knob — probe § 6 asserts territory-share stddev ∈ [10%, 25%]
  // at the flow-decay band around this default.
  flowDecayPerSec: 0.2,
  flowReinforcementPerTick: 1.0,
  flowToSpreadWeight: 0.5,
  flowToDefenseModifier: 0.5,

  mapSeed: 'random',
  rockDensity: 0.125,

  aiIntervalSec: 4,

  factionPersonalities: {
    blue: 'expansionist',
    green: 'defender',
    yellow: 'pressurist',
  },
};

/**
 * Reference theme — neutral naming, suitable for a stubbed game skeleton.
 * Real games override wholesale. Theme A (Creep vs Creep) from § 11 is the
 * natural baseline; the default below uses strain-neutral language so forks
 * don't inherit theme commitments they didn't pick.
 */
export const DEFAULT_DIRECTOR_THEME_VARS: DirectorThemeVars = {
  factionNames: {
    red: 'Faction Red',
    blue: 'Faction Blue',
    green: 'Faction Green',
    yellow: 'Faction Yellow',
  },
  factionEssenceNames: {
    red: 'Red Essence',
    blue: 'Blue Essence',
    green: 'Green Essence',
    yellow: 'Yellow Essence',
  },
  factionColors: {
    red: '#c0392b',
    blue: '#2980b9',
    green: '#27ae60',
    yellow: '#e2b93b',
  },

  tendrilNoun: 'spread',
  hotspotNoun: 'hotspot',
  metaCurrencyName: 'Command',
  personalityNames: {
    expansionist: 'Expansionist',
    defender: 'Defender',
    pressurist: 'Pressurist',
    greedy: 'Greedy',
  },

  roundLossFlavour: 'The round ends.',
  firstWinFlavour: 'Your faction finishes first.',
  dominationFlavour: 'Your faction has dominated the map.',
  endOfArcMessage: 'Arc complete.',
};

export const DEFAULT_DIRECTOR_VARS: DirectorVars = {
  archetype: DEFAULT_DIRECTOR_ARCHETYPE_VARS,
  theme: DEFAULT_DIRECTOR_THEME_VARS,
  balance: DEFAULT_DIRECTOR_BALANCE_VARS,
};
