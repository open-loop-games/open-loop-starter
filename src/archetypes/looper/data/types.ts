import type { DecimalSource } from 'open-loop-engine';

// ─── Skeleton ───
// 5 skills (gen + instinct two-tier per skill); 4 zones with predicate-gated
// unlocks; 16-20 actions distributed across zones with skill-XP grants. The
// skeleton counts are fork-of-skeleton decisions; balance constants live in
// `balance.ts`; costume strings (skill / zone / action names + descriptions)
// are co-located on each definition entry.

// ─── Costume ───
// Theme A — "Classic Adventuring". Combat / Magic / Practical / Alchemy /
// Crafting skills; Beginnersville → Forest Path → Merchanton → Ruined Keep
// zone ladder.

export interface SkillDef {
  id: string;
  name: string;
  description: string;
}

/**
 * Predicate-shaped trigger evaluated by `modules/zones.ts`. The watch-and-
 * bridge calls `zones.unlock(zoneId)` on rising edge. Cumulative across loops
 * (action-completion-count and instinct skill-level both persist).
 */
export type ZoneRequirement =
  | { trigger: 'action-completion-count'; actionId: string; value: number }
  | { trigger: 'skill-level'; skillId: string; tier: 'gen' | 'instinct'; value: number }
  | { trigger: 'loop-count'; value: number };

export interface ZoneDef {
  id: string;
  name: string;
  description: string;
  /** Zone 0 has empty requires; later zones list one or more. AND across entries. */
  requires: ZoneRequirement[];
}

export interface ActionDef {
  id: string;
  name: string;
  description: string;
  zoneId: string;
  /** Mana cost at skill level 0. Effective cost divides by (1 + genLevel / skillLevelDivisor). */
  baseCost: DecimalSource;
  /** XP grants at completion. One entry per affected skill. */
  xpGrants: { skillId: string; xp: DecimalSource }[];
}

// ─── Balance ───

export interface LooperBalance {
  /** Time-budget pool size at loop start. Bisection target for beat-2 sim window. */
  timeResourcePoolBase: DecimalSource;
  /** cost = baseCost / (1 + genLevel / skillLevelDivisor). */
  skillLevelDivisor: DecimalSource;
  /** Instinct XP grant per gen XP earned. Default 0.01 (PK pattern). */
  instinctXpRatio: DecimalSource;
  /** Retention multiplier shape: 1 + (instinctLevel / retentionDivisor) ^ retentionExponent. */
  retentionDivisor: DecimalSource;
  retentionExponent: DecimalSource;
  /**
   * Default `true` — the loop reset *is* the retention/prestige tier; toggling
   * off makes the demo a one-loop game. Documented in `balance/shape.ts` (lands
   * with the balance leaf).
   */
  loopResetEnabled: boolean;
}

/**
 * Typed read view of module state, exposed to predicate closures (zone-unlock
 * requirements, future achievement / arc gates). Methods encapsulate Decimal
 * comparisons so `data/*.ts` never imports the engine runtime. Modules
 * implement helpers over live injection-key refs.
 */
export interface LooperGameState {
  manaAtLeast(amount: DecimalSource): boolean;
  skillLevelAtLeast(skillId: string, tier: 'gen' | 'instinct', n: number): boolean;
  actionCompletedAtLeast(actionId: string, count: number): boolean;
  zoneUnlocked(zoneId: string): boolean;
  currentZoneIs(zoneId: string): boolean;
  loopCountAtLeast(n: number): boolean;
  /** Effective skill multiplier from gen + instinct chain (apply(1)). */
  retentionMultiplier(skillId: string): number;
  /** Sim-time seconds since the current loop began. */
  secondsSinceLoopStart(): number;
}

export interface LooperData {
  skills: SkillDef[];
  zones: ZoneDef[];
  actions: ActionDef[];
  balance: LooperBalance;
}
