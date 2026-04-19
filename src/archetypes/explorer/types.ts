/**
 * Explorer archetype — vars types.
 *
 * The canonical type contract for an Explorer-archetype game. Mirrors
 * the vars schema in archetypes/explorer.md § 5. Games under
 * src/modules/mods/<game>/vars/ implement these interfaces.
 */
import type { DecimalSource } from 'open-loop-engine';

export type AdjacencyTopology = 'grid-4' | 'grid-8' | 'graph';
export type ItemIdentityMode = 'typed-fungible' | 'per-instance';
export type MapStyleHint = 'ascii' | 'tile-iconic' | 'schematic' | 'narrative-text';
export type ZoneUnlockRequirement =
  | 'exploration-fraction'
  | 'landmark-investigated'
  | 'equipment-acquired';

/**
 * Map + inventory + party shape. Diverging here constitutes "forking
 * the skeleton" rather than tuning — zone count, adjacency topology,
 * and item-identity mode distinguish sub-variants of Explorer.
 */
export interface ExplorerArchetypeVars {
  /** Number of distinct zones in the world. Default 4. */
  zoneCount: number;
  /** Sector count per zone; length === zoneCount. Default [12, 16, 20, 24]. */
  sectorsPerZone: number[];
  /** How sectors connect. Default 'grid-4'. */
  adjacencyTopology: AdjacencyTopology;
  /** Enable fog-of-war visibility tracking. Default true. */
  fogOfWarEnabled: boolean;
  /** Adopt Level 13-style deterministic seed-based world generation. Default false. */
  seedBasedWorld: boolean;

  /** 'typed-fungible' (counts per item type) vs 'per-instance' (each item carries its own state). Default 'typed-fungible'. */
  itemIdentityMode: ItemIdentityMode;
  /** Initial bag capacity before upgrades. Default 5. */
  baseBagCapacity: number;
  /** Equipment slot count (weapon, tool, warmth-garment). Default 3. */
  equipmentSlotCount: number;

  /** Party size. 1 = solo avatar; > 1 adds Level 13-style explorers. Default 1. */
  partySize: number;
  /** Enable companion / explorer NPCs. Default false. */
  companionsEnabled: boolean;

  /** Core resources (food, water, metal, rope, concrete). Default 5. */
  coreResourceCount: number;
  /** Subset of core resources that drain during expeditions. Default 2 (food, water). */
  consumableResourceCount: number;
}

/**
 * Costume over the skeleton. Zero mechanical impact — names, flavour,
 * UI copy only. Swapping themes does not affect beat timing.
 */
export interface ExplorerThemeVars {
  /** Length must equal ExplorerArchetypeVars.zoneCount. */
  zoneNames: Array<{ singular: string; plural: string; flavour: string }>;
  /** Length must equal ExplorerArchetypeVars.coreResourceCount. */
  resourceNames: Array<{ singular: string; plural: string }>;
  /** The player character's label ('Survivor', 'Spelunker', 'Captain', ...). */
  avatarName: string;
  /** Rendering hint for the map widget. Forks may ignore. */
  mapStyleHint: MapStyleHint;
  landmarkFlavour: Array<{ label: string; description: string; zone: number }>;
  equipmentFlavour: Array<{ label: string; description: string; slot: string }>;
  endOfArcMessage: string;
}

export interface ActionCost {
  /** Sim-seconds the action takes to complete. */
  duration: number;
  /** Resource costs consumed on start; keyed by resource id. */
  costs: Record<string, DecimalSource>;
  /** Optional yields produced on completion (scavenge-shape). */
  yield?: Record<string, DecimalSource>;
}

export interface ZoneUnlockThreshold {
  /** 1-indexed zone that unlocks when this threshold is satisfied. */
  zone: number;
  requires: ZoneUnlockRequirement;
  /** Fraction for 'exploration-fraction', count for 'landmark-investigated', item-id for 'equipment-acquired'. */
  value: number | string;
}

export interface EquipmentRecipe {
  id: string;
  /** Slot the crafted item occupies. */
  slot: string;
  /** Multi-resource cost to craft. */
  requires: Record<string, DecimalSource>;
}

/**
 * Mechanical overrides. Beat timing is a function of these; changes
 * must be validated against beat-map tolerances in archetypes/explorer.md § 6.
 */
export interface ExplorerBalanceVars {
  /** Sim-time + resource cost + yield for each core action. */
  actionCosts: {
    scout: ActionCost;
    scavenge: ActionCost;
    investigate: ActionCost;
    clearWaste: ActionCost;
  };

  /** Beat-6 / beat-7 pacing lever. */
  zoneUnlockThresholds: ZoneUnlockThreshold[];

  itemDropRates: {
    /** Base probability that a scavenge action produces an item. */
    perScavengeBaseRate: number;
    /** Additive bonus applied to the first scavenge of a given sector. */
    perSectorFirstScavengeBonus: number;
    /** Weights per rarity tier; the sum across keys must === 1. */
    rarityDistribution: Record<string, number>;
  };

  /** Ordered capacity ladder (e.g. [5, 8, 12, 18, 25]). */
  bagCapacityUpgradeSteps: number[];
  /** Cost per upgrade step; length === bagCapacityUpgradeSteps.length - 1. */
  bagCapacityUpgradeCosts: Array<Record<string, DecimalSource>>;

  /** Adjacency radius revealed by a single scout action. Default 1. */
  scoutRevealRadius: number;
  /** Multiplicative cost bump per already-explored sector (sub-linear discovery curve). Default 1.02. */
  fogRevealDecayPerSector: number;

  /** Multi-resource camp construction cost. */
  campConstructionCost: Record<string, DecimalSource>;
  /** Per-equipment recipes gated at the workshop. */
  equipmentCraftingCosts: EquipmentRecipe[];

  /** Arc-closure threshold — fraction of total sectors charted. Default 0.35. */
  territoryChartedThreshold: number;
  /** Per-achievement contribution to the action-bonus chain. Default 1.02. */
  achievementMultiplier: number;

  /** Optional seed; only consumed when archetype.seedBasedWorld is true. */
  worldSeed?: number;
}

export interface ExplorerVars {
  archetype: ExplorerArchetypeVars;
  theme: ExplorerThemeVars;
  balance: ExplorerBalanceVars;
}

export interface ExplorerBalanceVarsOverride {
  actionCosts?: Partial<ExplorerBalanceVars['actionCosts']>;
  zoneUnlockThresholds?: ZoneUnlockThreshold[];
  itemDropRates?: Partial<ExplorerBalanceVars['itemDropRates']>;
  bagCapacityUpgradeSteps?: number[];
  bagCapacityUpgradeCosts?: Array<Record<string, DecimalSource>>;
  scoutRevealRadius?: number;
  fogRevealDecayPerSector?: number;
  campConstructionCost?: Record<string, DecimalSource>;
  equipmentCraftingCosts?: EquipmentRecipe[];
  territoryChartedThreshold?: number;
  achievementMultiplier?: number;
  worldSeed?: number;
}

export type ExplorerVarsOverride = {
  archetype?: Partial<ExplorerArchetypeVars>;
  theme?: Partial<ExplorerThemeVars>;
  balance?: ExplorerBalanceVarsOverride;
};
