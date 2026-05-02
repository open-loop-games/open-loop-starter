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

/**
 * Discriminated requirement spec. Data files stay engine-free by emitting
 * structured kind+args; the achievements module dispatches on `kind` and
 * builds reactive predicates that close over engine handles.
 */
export type AchievementSpec =
  | { kind: 'lifetime-at-least'; threshold: DecimalSource }
  | { kind: 'producer-count-at-least'; producer: string; count: number }
  | { kind: 'click-count-at-least'; count: number }
  | { kind: 'upgrade-bought'; upgradeId: string }
  | { kind: 'any-upgrade-bought'; upgradeIds: string[] }
  | { kind: 'all-producers-owned' }
  | { kind: 'all-tier1-upgrades' }
  | { kind: 'arc-close' };

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  hidden?: boolean;
  /** Multiplicative reward when earned. Defaults to `balance.achievementMultiplier`. */
  reward?: DecimalSource;
  spec: AchievementSpec;
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
