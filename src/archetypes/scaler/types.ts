/**
 * Scaler archetype — vars types.
 *
 * The canonical type contract for a Scaler-archetype game. Mirrors the
 * vars schema in archetypes/scaler.md § 5. Games under
 * src/modules/mods/<game>/vars/ implement these interfaces.
 */
import type { DecimalSource } from 'open-loop-engine';

export type ModifierEvaluationOrder = 'layered-multiplicative' | 'sequential-layered';
export type ChallengeRewardShape = 'linear-stack' | 'ecc-softcap';
export type AutoPrestigeUnlockLayer = 1 | 2 | 3 | 'disabled';
export type PrestigeFormulaFamily = 'log' | 'sqrt' | 'polynomial';
export type SoftcapShape = 'sqrt' | 'log' | 'linear-slow';
export type LayerUnlockTrigger = 'layer-n-currency' | 'challenges-completed' | 'layer-n-total';

/**
 * Skeleton shape. Diverging here constitutes "forking the skeleton"
 * rather than tuning — the prestige-layer count, modifier evaluation
 * order, and challenge reward shape distinguish sub-variants of Scaler.
 */
export interface ScalerArchetypeVars {
  /** Number of nested prestige layers. Range 2–5; default 3 (AD-like). */
  prestigeLayerCount: number;
  /** Base-layer producer tier count. */
  dimensionCount: number;
  /** Per-layer upgrade-tree size. */
  upgradesPerLayer: number;
  /** Challenges attached to each prestige tier. */
  challengesPerLayer: number;
  /** Total achievement count across production + layer-progress + hidden. */
  achievementCount: number;
  modifierEvaluationOrder: ModifierEvaluationOrder;
  challengeRewardShape: ChallengeRewardShape;
  /** Disabled by default; unlocks in mid-arc per beat map. */
  autoPrestigeUnlockLayer: AutoPrestigeUnlockLayer;
}

/**
 * Costume over the skeleton. Zero mechanical impact — names, flavour,
 * UI copy only. Swapping themes does not affect beat timing.
 */
export interface ScalerThemeVars {
  baseResourceName: { singular: string; plural: string };
  /** Length must equal ScalerArchetypeVars.prestigeLayerCount. */
  layerCurrencyNames: Array<{ singular: string; plural: string }>;
  /** Length must equal ScalerArchetypeVars.prestigeLayerCount. */
  prestigeButtonLabels: string[];
  /** Length must equal ScalerArchetypeVars.dimensionCount. */
  dimensionNames: string[];
  upgradeFlavour: Array<{ label: string; description: string; layer: number }>;
  challengeFlavour: Array<{ label: string; description: string; layer: number }>;
  endOfArcMessage: string;
}

export interface PrestigeConversion {
  layer: number;
  family: PrestigeFormulaFamily;
  /** For 'log' / 'polynomial' families. */
  scale: DecimalSource;
  /** For 'polynomial' family. */
  exponent?: number;
  /** The base-resource value at which the conversion yields currency = 1. */
  threshold: DecimalSource;
}

export interface SoftcapThreshold {
  layer: number;
  /** Currency value above which the formula softens. */
  at: DecimalSource;
  afterShape: SoftcapShape;
}

export interface LayerUnlockThreshold {
  /** Which layer unlocks when this threshold trips. */
  layer: number;
  requires: LayerUnlockTrigger;
  value: DecimalSource;
}

/**
 * Mechanical overrides. Beat timing is a function of these; changes
 * must be validated against beat-map tolerances in archetypes/scaler.md § 6.
 */
export interface ScalerBalanceVars {
  baseDimensionCost: {
    firstTierBaseCost: DecimalSource;
    /** Inter-tier cost jump (tier N base = tier N-1 base × this). */
    interTierMultiplier: DecimalSource;
    /** Exponential per-purchase growth on a single tier. */
    perPurchaseGrowth: number;
  };

  prestigeConversions: PrestigeConversion[];

  /** Piecewise softcap thresholds, indexed by layer. */
  softcapThresholds: SoftcapThreshold[];

  /** Per-upgrade multiplier step (upgrades multiply their target by this). */
  layerUpgradeMultiplier: number;

  /** Per-completion multiplier added to the chain from each challenge completion. */
  challengeCompletionMultiplier: number;

  /** ECC (Effective Challenge Completions) stops stacking linearly after N. */
  eccSoftcapAt: number;

  layerUnlockThresholds: LayerUnlockThreshold[];

  /** Layer-1 prestige count at which auto-prestige tier 1 becomes available. */
  autoPrestigeUnlockLoopCount: number;
}

export interface ScalerVars {
  archetype: ScalerArchetypeVars;
  theme: ScalerThemeVars;
  balance: ScalerBalanceVars;
}

export type ScalerVarsOverride = {
  archetype?: Partial<ScalerArchetypeVars>;
  theme?: Partial<ScalerThemeVars>;
  balance?: DeepPartial<ScalerBalanceVars>;
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Array<infer U>
      ? Array<U>
      : DeepPartial<T[K]>
    : T[K];
};
