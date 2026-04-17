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

/** EP upgrade definition. Cost is in Eternity Points; all Layer 2 upgrades limit=1. */
export interface EPUpgradeDef {
  id: string;
  title: string;
  description: string;
  cost: DecimalSource;
}

/**
 * AD Infinity Challenge definition. `name` matches the engine-side
 * `ChallengeDef.name`; `restriction` is UI prose for the challenge card
 * explaining what the challenge alters while active.
 */
export interface ADChallengeDef {
  id: string;
  name: string;
  description: string;
  restriction: string;
  completionLimit?: number;
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
export const achievementDefs: AchievementDef[] = [];

/**
 * Antimatter threshold each Infinity Challenge targets for completion.
 * Shallow uniform 1e650 per OL-462 plan — source canonical (1e650 / 1e10500 /
 * 1e5000) is deferred; IC2 at 1e10500 is out of reach at the current Layer 0
 * pacing, so a uniform ceiling keeps the three playable under one balance pass.
 */
export const CHALLENGE_GOAL_ANTIMATTER: DecimalSource = '1e650';

/**
 * Reward multiplier applied to `productionChain` once a challenge has any
 * completions. `completionLimit: 1` so the multiplier resolves to this value
 * flat. Uniform ×1.3 matches canonical IC1.
 */
export const CHALLENGE_REWARD_MULTIPLIER: DecimalSource = 1.3;

export const challengeDefs: ADChallengeDef[] = [
  {
    id: 'ic1-combined',
    name: 'Combined',
    description: 'Two restrictions stacked: a middle-tier dimension produces nothing, and Dim Boosts grant no bonus.',
    restriction: 'Fourth Dimension produces 0. Dim Boost multiplier disabled.',
    completionLimit: 1,
  },
  {
    id: 'ic2-sacrifice',
    name: 'Auto-Sacrifice',
    description: 'Dimensional Sacrifice auto-fires on a 400ms cadence while the challenge is active, provided you own an 8th Dimension.',
    restriction: 'Dimensional Sacrifice auto-triggers every 400ms.',
    completionLimit: 1,
  },
  {
    id: 'ic3-tickspeed',
    name: 'Tickspeed Rewire',
    description: 'Tickspeed no longer grants ×1.1 per purchase. Instead each purchase grants (1.05 + galaxies × 0.005), so Tickspeed only contributes when you have Antimatter Galaxies.',
    restriction: 'Tickspeed multiplier becomes (1.05 + 0.005·galaxies) per purchase.',
    completionLimit: 1,
  },
];

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

/**
 * EP upgrades shipped in Layer 2. Adapted from AD source `eternity-upgrades.js` —
 * the skeleton has no Infinity/Time Dimensions, so the canonical ID/TD targets
 * retarget onto the archetype's existing productionChain:
 *   - epMult — AD mult by (EP + 1) (canonical id=1, idMultEP)
 *   - eternitiesMult — AD mult by (1 + 0.1 × eternities) (simplified id=2)
 *   - ipMult — AD mult by (1 + log10(IP + 1)) (cross-layer synergy; canonical id=3 retargeted)
 * Costs scaled so the first Eternity (~123 EP at the 1e1100 UI gate) affords
 * the first two; ipMult waits a run.
 */
export const epUpgradeDefs: EPUpgradeDef[] = [
  {
    id: 'epMult',
    title: 'Eternal Resonance',
    description: 'Antimatter Dimensions gain ×(Eternity Points + 1).',
    cost: 5,
  },
  {
    id: 'eternitiesMult',
    title: 'Recursive Endings',
    description: 'Antimatter Dimensions gain ×(1 + 0.1 × Eternities).',
    cost: 20,
  },
  {
    id: 'ipMult',
    title: 'Infinite Inheritance',
    description: 'Antimatter Dimensions gain ×(1 + log10(Infinity Points + 1)).',
    cost: 50,
  },
];
