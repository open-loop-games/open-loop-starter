import type { DecimalSource, Gate } from 'open-loop-engine';

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
  /** Multiplicative reward when earned. Defaults to `balance.achievementMultiplier`. */
  reward?: DecimalSource;
  /**
   * Engine-typed declarative requirement. Aggregate predicates (every
   * producer owned, every tier-1 upgrade bought, etc.) are expanded to
   * `all`/`any` Gate combinators at content-authoring time using the
   * structural ID lists in `data/`.
   */
  requirement: Gate;
}

export interface ProducerBalance {
  clickBaseValue: DecimalSource;
  tier1BaseRate: DecimalSource;
  producerCostGrowth: DecimalSource;
  achievementMultiplier: DecimalSource;
  milestoneThresholds: number[];
  milestoneBonusPerTier: DecimalSource;
  /** Tier-i upgrade cost as a multiple of the targeted producer's baseCost. */
  tier1UpgradeMultiplier: DecimalSource;
}

export interface ProducerData {
  producers: ProducerDef[];
  upgrades: UpgradeDef[];
  achievements: AchievementDef[];
  balance: ProducerBalance;
}
