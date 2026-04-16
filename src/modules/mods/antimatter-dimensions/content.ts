/**
 * AD content — pure data, no engine imports.
 *
 * Constants seeded verbatim from the AD source pin at
 * `/work/studio/open-loop-research/reference-code/AntimatterDimensionsSourceCode/`.
 * Only tiers 1–4 are shipped here; source defines 8 — higher tiers are out of
 * scope for the skeleton and will be added alongside dimboost in a later pass.
 */
import type { DecimalSource } from 'open-loop-engine';

/** Starting antimatter on a fresh game. */
export const STARTING_ANTIMATTER: DecimalSource = 10;

/** Multiplier applied per full pack of 10 bought to a dimension's rate. */
export const BUY_TEN_MULTIPLIER: DecimalSource = 2;

export interface DimensionDef {
  /** Tier 1..N. Dim 1 targets antimatter; Dim N>1 targets Dim N-1's count. */
  tier: number;
  id: string;
  name: string;
  description: string;
  /** First-purchase cost. */
  baseCost: DecimalSource;
  /** Cost multiplier applied per full pack of 10 bought. */
  baseCostMultiplier: DecimalSource;
  /** Baseline per-dim production rate (pre-modifier). */
  baseRate: DecimalSource;
}

export interface UpgradeDef {
  id: string;
  title: string;
  description: string;
}

/** IP upgrade definition. Cost is in Infinity Points; all Layer 1 upgrades are cost=1, limit=1. */
export interface IPUpgradeDef {
  id: string;
  title: string;
  description: string;
  cost: DecimalSource;
}

export interface ChallengeDef {
  id: string;
  title: string;
  description: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

export const dimensionDefs: DimensionDef[] = [
  {
    tier: 1,
    id: 'dim1',
    name: 'First Dimension',
    description: 'Produces Antimatter.',
    baseCost: 10,
    baseCostMultiplier: 1e3,
    baseRate: 10,
  },
  {
    tier: 2,
    id: 'dim2',
    name: 'Second Dimension',
    description: 'Produces First Dimensions.',
    baseCost: 100,
    baseCostMultiplier: 1e4,
    baseRate: 10,
  },
  {
    tier: 3,
    id: 'dim3',
    name: 'Third Dimension',
    description: 'Produces Second Dimensions.',
    baseCost: 1e4,
    baseCostMultiplier: 1e5,
    baseRate: 10,
  },
  {
    tier: 4,
    id: 'dim4',
    name: 'Fourth Dimension',
    description: 'Produces Third Dimensions.',
    baseCost: 1e6,
    baseCostMultiplier: 1e6,
    baseRate: 10,
  },
];

export const upgradeDefs: UpgradeDef[] = [];
export const challengeDefs: ChallengeDef[] = [];
export const achievementDefs: AchievementDef[] = [];

/**
 * IP upgrades shipped in Layer 1. Adapted from AD source
 * `infinity-upgrades.js`, trimmed for the 4-dimension skeleton:
 *   - totalTimeMult — gain × (totalMinutes / 2)^0.15
 *   - dim14mult — dims 1 & 4 get ×(1 + 0.2×infinities); source targets
 *     dims 1 & 8 but this skeleton only has tiers 1–4
 *   - buy10Mult — flat ×1.1 on each dim's rate
 * `dimboostMult` is dropped — the starter has no dimboost primitive.
 */
export const ipUpgradeDefs: IPUpgradeDef[] = [
  {
    id: 'totalTimeMult',
    title: 'Time Dilation',
    description: 'Antimatter Dimensions gain a multiplier based on total time played.',
    cost: 1,
  },
  {
    id: 'dim14mult',
    title: 'Tier Resonance',
    description: '1st and 4th Antimatter Dimensions gain a multiplier based on Infinities.',
    cost: 1,
  },
  {
    id: 'buy10Mult',
    title: 'Ten-fold Legacy',
    description: 'All Antimatter Dimensions gain a flat ×1.1 bonus.',
    cost: 1,
  },
];
