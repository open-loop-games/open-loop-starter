/**
 * Scaler archetype — default vars.
 *
 * Baseline values a fresh Scaler-archetype game starts with. Mirrors the
 * defaults called out in archetypes/scaler.md § 5. Balance baseline is
 * tuned to the 1–2h first-completion arc: first prestige around beat 4
 * (~20 min), second layer unlocked around beat 7 (~80 min), arc closure
 * at beat 8 with a third-layer teaser.
 *
 * Defaults lean on the Antimatter Dimensions shape (3 prestige layers,
 * 8 dimensions, logarithmic prestige formulas with piecewise softcaps)
 * as the most-validated Scaler composition in the research corpus.
 * Forks that want 2-layer compression (Synergism tier-1-cycle pacing)
 * or 5-layer depth (NGU-style) override `archetype.prestigeLayerCount`
 * and extend `prestigeConversions` / `layerUnlockThresholds`.
 */
import type {
  ScalerArchetypeVars,
  ScalerBalanceVars,
  ScalerThemeVars,
  ScalerVars,
} from './types';

export const DEFAULT_SCALER_ARCHETYPE_VARS: ScalerArchetypeVars = {
  prestigeLayerCount: 3,
  dimensionCount: 8,
  upgradesPerLayer: 6,
  challengesPerLayer: 8,
  achievementCount: 40,
  modifierEvaluationOrder: 'layered-multiplicative',
  challengeRewardShape: 'ecc-softcap',
  autoPrestigeUnlockLayer: 1,
};

export const DEFAULT_SCALER_BALANCE_VARS: ScalerBalanceVars = {
  baseDimensionCost: {
    firstTierBaseCost: '10',
    interTierMultiplier: '1000',
    perPurchaseGrowth: 1.15,
  },
  prestigeConversions: [
    { layer: 1, family: 'log', scale: '308', threshold: '1e12' },
    { layer: 2, family: 'sqrt', scale: '1e50', threshold: '1e100' },
    { layer: 3, family: 'polynomial', scale: '1', exponent: 0.5, threshold: '1e500' },
  ],
  softcapThresholds: [
    { layer: 1, at: '1e20', afterShape: 'sqrt' },
    { layer: 2, at: '1e10', afterShape: 'log' },
    { layer: 3, at: '1e6', afterShape: 'linear-slow' },
  ],
  layerUpgradeMultiplier: 2,
  challengeCompletionMultiplier: 1.02,
  eccSoftcapAt: 8,
  layerUnlockThresholds: [
    { layer: 2, requires: 'layer-n-total', value: '1e30' },
    { layer: 3, requires: 'challenges-completed', value: '8' },
  ],
  autoPrestigeUnlockLoopCount: 5,
};

/**
 * Reference theme — neutral naming for the stubbed skeleton. Real games
 * override wholesale. Array lengths match the archetype vars (3 layers,
 * 8 dimensions).
 */
export const DEFAULT_SCALER_THEME_VARS: ScalerThemeVars = {
  baseResourceName: { singular: 'base', plural: 'base' },
  layerCurrencyNames: [
    { singular: 'layer-1', plural: 'layer-1' },
    { singular: 'layer-2', plural: 'layer-2' },
    { singular: 'layer-3', plural: 'layer-3' },
  ],
  prestigeButtonLabels: ['Prestige', 'Ascend', 'Transcend'],
  dimensionNames: [
    'dim-1',
    'dim-2',
    'dim-3',
    'dim-4',
    'dim-5',
    'dim-6',
    'dim-7',
    'dim-8',
  ],
  upgradeFlavour: [],
  challengeFlavour: [],
  endOfArcMessage: 'Arc complete.',
};

export const DEFAULT_SCALER_VARS: ScalerVars = {
  archetype: DEFAULT_SCALER_ARCHETYPE_VARS,
  theme: DEFAULT_SCALER_THEME_VARS,
  balance: DEFAULT_SCALER_BALANCE_VARS,
};
