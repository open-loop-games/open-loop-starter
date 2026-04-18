/**
 * Producer archetype — vars types.
 *
 * The canonical type contract for a Producer-archetype game. Mirrors the
 * vars schema in archetypes/producer.md § 5. Games under
 * src/modules/mods/<game>/vars/ implement these interfaces.
 *
 * Shape is deliberately prose-primary in the doc, typed here. Keep the
 * two in sync — the archetype-doc validator (pending) enforces it.
 */
import type { DecimalSource } from 'open-loop-engine';

/**
 * Skeleton shape of the producer hierarchy. Forks rarely edit these;
 * diverging here constitutes "forking the skeleton" rather than tuning.
 */
export interface ProducerArchetypeVars {
  producerTierCount: number;
  upgradesPerProducer: number;
  globalUpgradeCount: number;
  achievementCount: number;
  bulkBuyEnabled: boolean;
  /** null = no softcap. Decimal-source string when enabled. */
  softCapClickContributionAt: DecimalSource | null;
}

/**
 * Costume over the skeleton. Zero mechanical impact — names, flavour,
 * UI copy only. Swapping themes does not affect beat timing, balance
 * probes, or sim assertions.
 */
export interface ProducerThemeVars {
  resourceName: { singular: string; plural: string };
  /** Length must equal ProducerArchetypeVars.producerTierCount. */
  producerNames: string[];
  upgradeFlavour: Array<{ label: string; description: string }>;
  achievementFlavour: Array<{ label: string; description: string; hidden?: boolean }>;
  clickButtonLabel: string;
  /** Fires at beat 8 (arc closure). */
  endOfArcMessage: string;
}

/**
 * Mechanical overrides — the tuning surface. Beat timing is a function of
 * these values; changes here must be validated against the beat-map
 * tolerances in archetypes/producer.md § 6.
 */
export interface ProducerBalanceVars {
  clickBaseValue: DecimalSource;
  tier1BaseRate: DecimalSource;
  /** Inter-tier cost multipliers. Length must equal producerTierCount. */
  tierCostRatios: number[];
  producerCostScaling: {
    baseCost: DecimalSource;
    growth: number;
  };
  upgradeMultiplier: number;
  globalUpgradeMultiplier: number;
  achievementMultiplier: number;
  /** Quantity-tracking thresholds per producer. */
  milestoneThresholds: number[];
  /** Multiplicative bonus per threshold hit. */
  milestoneBonusPerTier: number;
}

/**
 * The merged shape a game loads at runtime. `loadProducerVars` deep-merges
 * archetype → theme → balance in that order.
 */
export interface ProducerVars {
  archetype: ProducerArchetypeVars;
  theme: ProducerThemeVars;
  balance: ProducerBalanceVars;
}

/** Deep-partial override shape accepted by `loadProducerVars`. */
export type ProducerVarsOverride = {
  archetype?: Partial<ProducerArchetypeVars>;
  theme?: Partial<ProducerThemeVars>;
  balance?: DeepPartial<ProducerBalanceVars>;
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Array<infer U>
      ? Array<U>
      : DeepPartial<T[K]>
    : T[K];
};
