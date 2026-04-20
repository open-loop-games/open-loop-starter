/**
 * Director archetype — vars types.
 *
 * The canonical type contract for a Director-archetype game. Mirrors the
 * vars schema in archetypes/director.md § 5. Games under
 * src/modules/mods/<game>/vars/ implement these interfaces.
 *
 * Director is `candidate` status: composition is proven by one consumer
 * (creep-vs-creep); canonical upgrade waits for a second consumer.
 */
import type { DecimalSource } from 'open-loop-engine';

export type DirectorFactionId = 'red' | 'blue' | 'green' | 'yellow';

export type DirectorAiPersonality = 'expansionist' | 'defender' | 'pressurist' | 'greedy';

export type DirectorTerrainKind = 'rock' | 'open' | 'spawn' | 'hotspot';

export type DirectorSymmetry = 'rotational-4fold' | 'mirror' | 'none';

/**
 * Skeleton shape of a Director game. Forks rarely edit these; diverging
 * here constitutes "forking the skeleton" rather than tuning.
 */
export interface DirectorArchetypeVars {
  mapWidth: number;
  mapHeight: number;
  /** Fixed at 4 in this skeleton — symmetry + hotspot tiering assume it. */
  factionCount: 4;
  symmetry: DirectorSymmetry;

  roundLengthSec: number;
  slowStartDelaySec: number;
  endOfRoundCountdownSec: number;

  nearHotspotsPerFaction: number;
  naturalHotspotsPerFaction: number;
  contestedHotspots: number;
  centerHotspots: 0 | 1;

  flowFieldEnabled: boolean;
  flowCouplesToSpread: boolean;
  flowCouplesToCombat: boolean;

  startingGoalSlots: number;
  maxGoalSlots: number;

  playerFaction: DirectorFactionId;
  aiPersonalities: DirectorAiPersonality;

  spreadLoopHz: number;
  combatLoopHz: number;
  aiPickerHz: number;
}

/**
 * Costume over the skeleton. Zero mechanical impact — names, flavour,
 * UI copy only. Swapping themes does not affect beat timing, balance
 * probes, or sim assertions.
 */
export interface DirectorThemeVars {
  factionNames: Record<DirectorFactionId, string>;
  factionEssenceNames: Record<DirectorFactionId, string>;
  factionColors: Record<DirectorFactionId, string>;

  tendrilNoun: string;
  hotspotNoun: string;
  metaCurrencyName: string;
  personalityNames: Record<DirectorAiPersonality, string>;

  roundLossFlavour: string;
  firstWinFlavour: string;
  dominationFlavour: string;
  /** Fires at beat 7 (arc closure). */
  endOfArcMessage: string;
}

/**
 * Mechanical overrides — the tuning surface. Beat timing and the
 * outcome distribution are functions of these values; changes must be
 * validated against the tolerances in archetypes/director.md § 6.
 */
export interface DirectorBalanceVars {
  baseHp: DecimalSource;
  baseAttack: DecimalSource;
  baseDefense: DecimalSource;

  hotspotBaseYield: number;
  hotspotCapacity: number;
  hotspotRegenPerSec: number;
  nearHotspotYieldMul: number;
  naturalHotspotYieldMul: number;
  contestedHotspotYieldMul: number;
  centerHotspotYieldMul: number;

  goalMultiplier: DecimalSource;

  essenceUpgradeCostScaling: number;
  essenceUpgradePerLevel: number;
  essenceUpgradeMaxLevel: DecimalSource;

  metaCurrencyPerCell: number;
  metaCurrencyPerHotspot: number;

  metaUpgradePerLevel: DecimalSource;
  metaUpgradeMaxLevel: DecimalSource;

  spreadBaseRatePerSec: number;
  spreadTerrainMul: Record<DirectorTerrainKind, number>;

  flowDecayPerSec: number;
  flowReinforcementPerTick: number;
  flowToSpreadWeight: number;
  flowToDefenseModifier: number;

  mapSeed: number | 'random';
  rockDensity: number;

  aiIntervalSec: number;

  factionPersonalities: Record<Exclude<DirectorFactionId, 'red'>, DirectorAiPersonality>;
}

/**
 * The merged shape a game loads at runtime. `loadDirectorVars` deep-merges
 * archetype → theme → balance in that order.
 */
export interface DirectorVars {
  archetype: DirectorArchetypeVars;
  theme: DirectorThemeVars;
  balance: DirectorBalanceVars;
}

/** Deep-partial override shape accepted by `loadDirectorVars`. */
export type DirectorVarsOverride = {
  archetype?: Partial<DirectorArchetypeVars>;
  theme?: DeepPartial<DirectorThemeVars>;
  balance?: DeepPartial<DirectorBalanceVars>;
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Array<infer U>
      ? Array<U>
      : DeepPartial<T[K]>
    : T[K];
};
