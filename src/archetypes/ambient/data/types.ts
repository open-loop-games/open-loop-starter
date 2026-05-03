import type { DecimalSource } from 'open-loop-engine';

// ─── Skeleton ───
// 5 auto-producer tiers; 12 visibility unlocks; 20 achievements
// (10 milestone-count + 10 time-based); 6 scene variants. The skeleton
// counts are a fork-of-skeleton decision; balance constants live in
// `producers.ts` `AMBIENT_BALANCE`; costume strings live alongside each
// definition entry.

export interface AutoProducerDef {
  id: string;
  /** Display name (costume). */
  name: string;
  /** Per-second per-unit production at trigger 'continuous'. */
  baseRate: DecimalSource;
  purchase: {
    baseCost: DecimalSource;
    /** Multiplicative cost growth per purchase (default 1.08 — gentler than Producer). */
    costScaling: DecimalSource;
    /**
     * Starting count after fresh boot. Ambient ships zero-click (surface 9);
     * the lowest tier seeds at 1 to make beat-1 ("First passive production
     * visible") reachable without a manual trigger. Other tiers default 0.
     */
    initialAmount?: DecimalSource;
  };
}

/** What an unlock reveals when its threshold is crossed. */
export type UnlockReveal =
  | { kind: 'producer'; producerId: string }
  | { kind: 'scene-variant'; variantId: string }
  | { kind: 'ui'; affordance: 'achievement-grid' | 'prestige' | 'welcome-back' };

export interface UnlockDef {
  id: string;
  /** Display name (costume). */
  label: string;
  description?: string;
  /**
   * Resource-lifetime threshold gating this visibility flip. Gates against
   * cumulative produced (lifetime), not the current resource value — spending
   * sprouts on producers must not re-hide unlocked content.
   */
  threshold: DecimalSource;
  reveals: UnlockReveal;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  hidden?: boolean;
  /**
   * When true, the predicate is evaluated at session-resume only ("returned
   * after 12h absence"-style), not every tick. Default: tick-time.
   */
  triggeredOnResume?: boolean;
  /** Headline multiplicative reward. Defaults to balance.achievementMultiplier. */
  rewardMultiplier?: DecimalSource;
  requirement: (state: AmbientGameState) => boolean;
}

export interface SceneVariantDef {
  id: string;
  /** Display name (costume). */
  label: string;
  /**
   * Lifetime threshold gating variant unlock. Default variant has threshold 0.
   * Must match the threshold of the matching scene-variant `UnlockDef` —
   * the unlock is the gate, the variant is what it reveals.
   */
  threshold: DecimalSource;
  /** Per-fork visual contract — keys a renderer asset/state. */
  visualKey: string;
}

// ─── Balance ───

export interface AmbientBalance {
  /**
   * Multiplicative scaling on tier-1 (planter) base rate. Default 1.0
   * (identity). Bound to planter's `rateChain` in `modules/auto-producers.ts`
   * so the solver can perturb it via `pushScope('balance/tier1BaseRate', ...)`
   * without rebuilding the engine. `ProducerMapping.baseRate` is static
   * `DecimalSource`, so scaling rides a chain modifier rather than wrapping
   * the producer's `baseRate` field directly.
   */
  tier1BaseRate: DecimalSource;
  /** Multiplicative cost growth per producer purchase. Default 1.08. */
  producerCostGrowth: DecimalSource;
  /** Per-achievement headline contribution. Default 1.02. */
  achievementMultiplier: DecimalSource;
  /** Caps the wall-clock gap delivered to processOfflineTime. Default 12h. */
  offlineCapHours: DecimalSource;
  /**
   * When false, modules/prestige is skipped at engine construction — default
   * ships zero prestige code paths active.
   */
  prestigeEnabled: boolean;
  prestigeMultiplierBase: DecimalSource;
  /** Resource threshold at which the prestige action becomes available. */
  prestigeEligibleThreshold: DecimalSource;
}

/**
 * Typed read view of module state, exposed to data/*.ts predicates.
 * Methods encapsulate Decimal comparisons so data files never import the
 * engine runtime. Modules implement helpers over live injection-key refs.
 */
export interface AmbientGameState {
  primaryAtLeast(amount: DecimalSource): boolean;
  primaryLifetimeAtLeast(amount: DecimalSource): boolean;
  perSecondAtLeast(amount: DecimalSource): boolean;
  producerCountAtLeast(id: string, count: number): boolean;
  unlockVisible(id: string): boolean;
  sceneVariantUnlocked(id: string): boolean;
  ownsEveryProducer(): boolean;
  /** Sim-time seconds since the live session began (post-load, post-catch-up). */
  secondsSinceLastResume(): number;
  /** Sim-time seconds the save has accumulated across all resets (TimeSystem.totalPlayTime). */
  secondsSinceCreation(): number;
  /** True when the most-recent resume's wall-clock catch-up gap was ≥ seconds. */
  offlineGapAtLeast(seconds: number): boolean;
}

export interface AmbientData {
  producers: AutoProducerDef[];
  unlocks: UnlockDef[];
  achievements: AchievementDef[];
  sceneVariants: SceneVariantDef[];
  balance: AmbientBalance;
}
