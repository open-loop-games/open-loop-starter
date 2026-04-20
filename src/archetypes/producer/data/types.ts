import type { DecimalSource } from 'open-loop-engine';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Definition interfaces shared across all data files. Editing these shapes
// forks the archetype; tuning happens against the balance constants below.

export interface ProducerDef {
  id: string;
  name: string;
  trigger: 'continuous' | 'manual';
  baseRate: DecimalSource;
  purchase?: {
    baseCost: DecimalSource;
    costScaling: DecimalSource;
  };
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: DecimalSource;
  /** Producer whose rateChain receives the grant. `null` = headline chain. */
  targetProducerId: string | null;
  multiplier: DecimalSource;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  hidden?: boolean;
  requirement: (state: ProducerGameState) => boolean;
  /** Headline-chain multiplicative reward. Defaults to `balance.achievementMultiplier`. */
  rewardMultiplier?: DecimalSource;
}

export interface ProducerBalance {
  clickBaseValue: DecimalSource;
  tier1BaseRate: DecimalSource;
  producerCostGrowth: DecimalSource;
  achievementMultiplier: DecimalSource;
  milestoneThresholds: number[];
  milestoneBonusPerTier: DecimalSource;
}

/**
 * Typed read view of module state, exposed to achievement predicates.
 * Methods encapsulate Decimal comparisons so `data/*.ts` never imports
 * the engine runtime.
 */
export interface ProducerGameState {
  primaryAtLeast: (amount: DecimalSource) => boolean;
  primaryLifetimeAtLeast: (amount: DecimalSource) => boolean;
  perSecondAtLeast: (amount: DecimalSource) => boolean;
  producerCountAtLeast: (id: string, count: number) => boolean;
  upgradeBought: (id: string) => boolean;
  clickCountAtLeast: (count: number) => boolean;
  ownsEveryProducer: () => boolean;
  allTier1UpgradesBought: () => boolean;
  secondsSinceLastClick: () => number;
}

export interface ProducerData {
  producers: ProducerDef[];
  upgrades: UpgradeDef[];
  achievements: AchievementDef[];
  balance: ProducerBalance;
}
