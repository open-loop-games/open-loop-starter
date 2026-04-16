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
