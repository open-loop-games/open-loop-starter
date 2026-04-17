/**
 * AD content — pure data, no engine imports.
 *
 * Constants seeded verbatim from the AD source pin at
 * `/work/studio/open-loop-research/reference-code/AntimatterDimensionsSourceCode/`.
 * All 8 tiers are unlocked from the start; the canonical tier-unlock-via-boost
 * feature is deferred — DimBoost here grants its multiplier and resets the
 * lower tiers but does not gate tier availability.
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
  {
    tier: 5,
    id: 'dim5',
    name: 'Fifth Dimension',
    description: 'Produces Fourth Dimensions.',
    baseCost: 1e9,
    baseCostMultiplier: 1e8,
    baseRate: 10,
  },
  {
    tier: 6,
    id: 'dim6',
    name: 'Sixth Dimension',
    description: 'Produces Fifth Dimensions.',
    baseCost: 1e13,
    baseCostMultiplier: 1e10,
    baseRate: 10,
  },
  {
    tier: 7,
    id: 'dim7',
    name: 'Seventh Dimension',
    description: 'Produces Sixth Dimensions.',
    baseCost: 1e18,
    baseCostMultiplier: 1e12,
    baseRate: 10,
  },
  {
    tier: 8,
    id: 'dim8',
    name: 'Eighth Dimension',
    description: 'Produces Seventh Dimensions.',
    baseCost: 1e24,
    baseCostMultiplier: 1e15,
    baseRate: 10,
  },
];

export const upgradeDefs: UpgradeDef[] = [];
export const challengeDefs: ChallengeDef[] = [];
export const achievementDefs: AchievementDef[] = [];

/**
 * IP upgrades shipped in Layer 1. Adapted from AD source `infinity-upgrades.js`:
 *   - totalTimeMult — gain × (totalMinutes / 2)^0.15
 *   - dim18mult — dims 1 & 8 get ×(1 + 0.2×infinities), matching canonical
 *   - buy10Mult — flat ×1.1 on each dim's rate
 * `dimboostMult` is deferred pending a deeper DimBoost primitive pass.
 */
export const ipUpgradeDefs: IPUpgradeDef[] = [
  {
    id: 'totalTimeMult',
    title: 'Time Dilation',
    description: 'Antimatter Dimensions gain a multiplier based on total time played.',
    cost: 1,
  },
  {
    id: 'dim18mult',
    title: 'Tier Resonance',
    description: '1st and 8th Antimatter Dimensions gain a multiplier based on Infinities.',
    cost: 1,
  },
  {
    id: 'buy10Mult',
    title: 'Ten-fold Legacy',
    description: 'All Antimatter Dimensions gain a flat ×1.1 bonus.',
    cost: 1,
  },
];
