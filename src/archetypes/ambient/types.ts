/**
 * Ambient archetype — vars types.
 *
 * The canonical type contract for an Ambient-archetype game. Mirrors the
 * vars schema in archetypes/ambient.md § 5. Games under
 * src/modules/mods/<game>/vars/ implement these interfaces.
 */
import type { DecimalSource } from 'open-loop-engine';

/**
 * Skeleton shape of the Ambient game. Forks rarely edit these; diverging
 * here constitutes "forking the skeleton" rather than tuning. `prestigeEnabled`
 * is the most-touched ArchetypeVar — toggles the optional softened-prestige
 * branch of the skeleton without changing pattern composition.
 */
export interface AmbientArchetypeVars {
  prestigeEnabled: boolean;
  autoProductionTiers: number;
  unlockTrackDepth: number;
  achievementCount: number;
  /** Target glance-check window [min, max] in minutes. */
  glanceCheckWindowMinutes: [number, number];
  offlineCapHours: number;
  /**
   * Opt-in cosmetic Challenge Systems variants. Only compatible with the
   * Ambient contract when non-completion carries zero progression penalty.
   */
  optionalChallengesEnabled: boolean;
}

/**
 * Costume over the skeleton. Zero mechanical impact — names, flavour,
 * scene variants, welcome-back copy. The Sensation payload lives in
 * `idleSceneVariants` as named visual states unlocked across the arc.
 */
export interface AmbientThemeVars {
  resourceName: { singular: string; plural: string };
  /** Length must equal AmbientArchetypeVars.autoProductionTiers. */
  producerNames: string[];
  /** Named visual states unlocked across the arc. Length ≥ 1; milestones reference by index. */
  idleSceneVariants: string[];
  unlockFlavour: Array<{ label: string; description: string }>;
  achievementFlavour: Array<{ label: string; description: string; hidden?: boolean }>;
  /** Fires at beat 7 (arc closure). */
  endOfArcMessage: string;
  /** Welcome-back copy template for beat 4 glance-check summary. */
  welcomeBackTemplate: string;
}

/**
 * Mechanical overrides — the tuning surface. Beat timing is a function of
 * these values; changes here must be validated against § 6 probe tolerances.
 */
export interface AmbientBalanceVars {
  tier1BaseRate: DecimalSource;
  producerCostScaling: {
    baseCost: DecimalSource;
    /** Gentler than Producer — default 1.08 vs Producer's 1.15. */
    growth: number;
  };
  /** Inter-tier cost multipliers. Length must equal autoProductionTiers. */
  tierCostRatios: number[];
  /** Resource-total thresholds gating visibility unlocks. Length must equal unlockTrackDepth. */
  unlockThresholds: DecimalSource[];
  /** Offline accumulation efficiency factor. 1.0 = full, 0.5 = half, etc. */
  offlineEfficiency: number;
  achievementMultiplier: number;
  /** Softened prestige base multiplier; only consulted when prestigeEnabled. */
  prestigeMultiplierBase: number;
  /** Resource threshold at which prestige becomes eligible — beat 7 trigger. */
  prestigeEligibleThreshold: DecimalSource;
}

/**
 * The merged shape a game loads at runtime. `loadAmbientVars` deep-merges
 * archetype → theme → balance in that order.
 */
export interface AmbientVars {
  archetype: AmbientArchetypeVars;
  theme: AmbientThemeVars;
  balance: AmbientBalanceVars;
}

/** Deep-partial override shape accepted by `loadAmbientVars`. */
export type AmbientVarsOverride = {
  archetype?: Partial<AmbientArchetypeVars>;
  theme?: Partial<AmbientThemeVars>;
  balance?: DeepPartial<AmbientBalanceVars>;
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Array<infer U>
      ? Array<U>
      : DeepPartial<T[K]>
    : T[K];
};
