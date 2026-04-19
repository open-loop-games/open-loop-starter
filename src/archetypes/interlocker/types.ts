/**
 * Interlocker archetype — vars types.
 *
 * The canonical type contract for an Interlocker-archetype game. Mirrors
 * the vars schema in archetypes/interlocker.md § 5. Games under
 * src/modules/mods/<game>/vars/ implement these interfaces.
 */
import type { DecimalSource } from 'open-loop-engine';

export type GraphCompletenessPolicy =
  | 'every-resource-positive'
  | 'every-building-active'
  | 'both';

export type SynergyEffect = 'multiplicative' | 'additive';

/**
 * Graph shape. Diverging here constitutes "forking the skeleton" — the
 * resource-tier count, per-tier widths, and synergy count distinguish
 * sub-variants of Interlocker rather than tuning levers.
 */
export interface InterlockerArchetypeVars {
  /** Count of resource tiers. Default 3 (raw / basic / advanced). */
  resourceTierCount: number;
  /** Resources per tier; length === resourceTierCount. Default [3, 3, 2]. */
  resourcesPerTier: number[];
  /** Buildings per tier; one building family per conversion chain. Default [3, 4, 2]. */
  buildingCountPerTier: number[];
  /** Number of distinct conversion chains across the graph. Default 4. */
  conversionChainCount: number;
  /** Cross-building multipliers. Default 6. */
  synergyCount: number;
  /** Tech-tree nodes gating tier transitions and synergy reveals. Default 4. */
  techGateCount: number;
  /** Total achievement count across production + completeness + hidden. Default 24. */
  achievementCount: number;
  /** Bottlenecks (negative per-sec rates) are gameplay, not errors. Default true. */
  allowNegativeRates: boolean;
  /** Which signal defines the arc-closure beat 8 trigger. */
  arcClosureGraphCompletenessPolicy: GraphCompletenessPolicy;
}

/**
 * Costume over the skeleton. Zero mechanical impact — names, flavour,
 * UI copy only. Swapping themes does not affect beat timing.
 */
export interface InterlockerThemeVars {
  /** Per-tier resource names; outer length === resourceTierCount, inner length === resourcesPerTier[tier]. */
  resourceNames: Array<Array<{ singular: string; plural: string }>>;
  /** Flattened across tiers; length === sum(buildingCountPerTier). */
  buildingNames: string[];
  /** Length === techGateCount. */
  techNames: string[];
  synergyFlavour: Array<{
    label: string;
    description: string;
    sourceBuilding: string;
    targetResource: string;
  }>;
  recipeFlavour: Array<{ label: string; description: string }>;
  achievementFlavour: Array<{ label: string; description: string; hidden?: boolean }>;
  endOfArcMessage: string;
}

export interface Recipe {
  id: string;
  buildingId: string;
  /** Per-sec consumption at one building. */
  inputs: Record<string, DecimalSource>;
  /** Per-sec production at one building. */
  outputs: Record<string, DecimalSource>;
  /** null means always unlocked. */
  unlockedByTech: string | null;
}

export interface Synergy {
  id: string;
  /** The "from" side — every unit of this building contributes. */
  sourceBuildingId: string;
  /** The resource whose modifier chain this synergy joins. */
  targetResourceId: string;
  effect: SynergyEffect;
  /** Magnitude per source unit (e.g. 0.01 = +1% per unit; Kittens Workshop shape). */
  perSourceUnitMagnitude: number;
  /** Soft cap on total contribution; null = uncapped. */
  cap: number | null;
}

export interface TechCost {
  techId: string;
  /** Vector of resource costs. */
  requires: Record<string, DecimalSource>;
  /** Which resource/building tier this tech reveals. */
  unlocksTier: number;
}

/**
 * Mechanical overrides. Beat timing is a function of these; changes must
 * be validated against beat-map tolerances in archetypes/interlocker.md § 6.
 */
export interface InterlockerBalanceVars {
  buildingCostScaling: {
    /** First-unit cost per input resource, keyed by resource id. */
    baseCost: Record<string, DecimalSource>;
    /** Exponential per-purchase growth. Milder than Producer's 1.15. */
    perPurchaseGrowth: number;
  };

  recipes: Recipe[];
  synergies: Synergy[];
  techCosts: TechCost[];

  /** Per-achievement contribution to the modifier chain. */
  achievementMultiplier: number;
  /** Fraction of resources that must be producing at positive rate for arc closure. */
  graphCompletenessAchievementThreshold: number;
}

export interface InterlockerVars {
  archetype: InterlockerArchetypeVars;
  theme: InterlockerThemeVars;
  balance: InterlockerBalanceVars;
}

export interface InterlockerBalanceVarsOverride {
  buildingCostScaling?: Partial<InterlockerBalanceVars['buildingCostScaling']>;
  recipes?: Recipe[];
  synergies?: Synergy[];
  techCosts?: TechCost[];
  achievementMultiplier?: number;
  graphCompletenessAchievementThreshold?: number;
}

export type InterlockerVarsOverride = {
  archetype?: Partial<InterlockerArchetypeVars>;
  theme?: Partial<InterlockerThemeVars>;
  balance?: InterlockerBalanceVarsOverride;
};
