import type { DecimalSource } from 'open-loop-engine';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Definition interfaces shared across all data files. Editing these shapes
// forks the archetype; tuning happens against the balance constants in the
// per-entity data files.
//
// Three structural-fork toggles live on `SurvivorProgression`:
//   runMode       — 'continuous' (Vampire Survivors 30-min arc) vs 'round-based'
//                   (Brotato discrete waves with between-wave shops).
//   shopMode      — 'level-up-cards' (VS-style 3–4 card offers on level-up) vs
//                   'wave-shop' (Brotato-style end-of-wave material shop).
//   prestigeMode  — 'continuous-accumulator' (gold persists through failed runs —
//                   the VS default), 'run-reset' (classic prestige award), or
//                   'none' (single-run, no cross-run persistence).

export type RunMode = 'continuous' | 'round-based';
export type ShopMode = 'level-up-cards' | 'wave-shop';
export type PrestigeMode = 'none' | 'run-reset' | 'continuous-accumulator';

export type FiringPattern = 'arc' | 'projectile' | 'orbital' | 'area' | 'cross';
export type Targeting = 'nearest' | 'largest-group' | 'fixed-direction';

export interface WeaponDef {
  id: string;
  name: string;
  baseDamage: DecimalSource;
  baseCooldownSec: DecimalSource;
  firing: {
    pattern: FiringPattern;
    projectileCount?: number;
    areaRadius?: number;
    targeting?: Targeting;
  };
  /**
   * Per-level delta sequences, length 7 (level 1 → level 8). Any field absent
   * means no change at that tier. Multiplicative stacks apply to baseDamage /
   * baseCooldownSec; additive stacks apply to projectileCount.
   */
  levelGrowth: Partial<{
    damageMul: DecimalSource[];
    cooldownMul: DecimalSource[];
    projectileBonus: number[];
    areaMul: DecimalSource[];
  }>;
  /** Evolution prerequisite. Resolved against passives.ts and evolutions.ts. */
  evolvesInto?: {
    evolvedId: string;
    requiresPassiveId: string;
  };
}

export interface PassiveDef {
  id: string;
  name: string;
  baseEffect: {
    damageMul?: DecimalSource;
    cooldownMul?: DecimalSource;
    hpMul?: DecimalSource;
    luck?: DecimalSource;
    magnetRadius?: DecimalSource;
    areaMul?: DecimalSource;
    projectileSpeedMul?: DecimalSource;
    regenPerSec?: DecimalSource;
  };
  maxLevel: number;
}

export interface EvolutionDef {
  id: string;
  name: string;
  baseWeaponId: string;
  requiresPassiveId: string;
  firing: WeaponDef['firing'];
  /** Damage multiplier relative to level-8 base weapon. */
  damageMul: DecimalSource;
}

export interface EnemyDef {
  id: string;
  name: string;
  baseHp: DecimalSource;
  baseSpeed: number;
  xpGemValue: DecimalSource;
  /** 0–1 probability of gold drop on kill. */
  goldDropChance: DecimalSource;
  flying?: boolean;
  /** Boss enemies drop chests (evolution triggers) and do not spawn in regular schedules. */
  boss?: boolean;
}

export interface WaveScheduleEntry {
  minuteMark: number;
  add: Array<{ enemyId: string; density: number }>;
}

export interface BossScheduleEntry {
  minuteMark: number;
  enemyId: string;
}

export interface StageDef {
  id: string;
  name: string;
  waveSchedule: WaveScheduleEntry[];
  /** HP multiplier curve by minute. Length = runDurationMinutes. */
  hpCurve: DecimalSource[];
  bossSchedule: BossScheduleEntry[];
  runDurationMinutes: number;
}

export interface PowerUpDef {
  id: string;
  name: string;
  description: string;
  effect: {
    damageMul?: DecimalSource;
    hpMul?: DecimalSource;
    moveSpeedMul?: DecimalSource;
    xpMul?: DecimalSource;
    goldMul?: DecimalSource;
    luck?: DecimalSource;
    magnetRadius?: DecimalSource;
    rerollsPerLevelUp?: number;
    skipsPerLevelUp?: number;
    banishesPerLevelUp?: number;
  };
  /** Finite cap (5 in VS base), or a sentinel (use large finite) when effectively uncapped. */
  maxLevel: number;
  /** Per-level gold cost. Length must equal maxLevel. */
  costCurve: DecimalSource[];
}

export interface CharacterDef {
  id: string;
  name: string;
  startingWeaponId: string;
  passiveBonus: PassiveDef['baseEffect'];
  unlock: {
    kind: 'default' | 'gold-purchase' | 'in-run-condition';
    goldCost?: DecimalSource;
    conditionId?: string;
  };
}

export type ModifierSource =
  | 'base'
  | 'weapon-level'
  | 'passive'
  | 'character'
  | 'power-up'
  | 'arcana';

export interface SurvivorBalance {
  /**
   * XP required for level N. Named curve or explicit function; workbench probes
   * replace the function wholesale via `createSurvivorEngine({ balance: {...} })`.
   */
  xpCurve: (level: number) => DecimalSource;
  /**
   * Ordered stack of modifier sources fed through `createModifierChain`. The
   * order is commutative under pure multiplication but affects Decimal rounding
   * at large magnitudes.
   */
  modifierStackOrder: ModifierSource[];
  /** Scalar on Luck's offer-pool weighting. Higher = rarer items more likely. */
  luckWeight: DecimalSource;
  /** Chest drop rate per boss kill (0–1). */
  chestDropRate: DecimalSource;
  /** Gem magnetism base radius in world units. */
  baseMagnetRadius: DecimalSource;
}

export interface SurvivorProgression {
  runMode: RunMode;
  shopMode: ShopMode;
  prestigeMode: PrestigeMode;
  weaponSlots: number;
  passiveSlots: number;
  /** Number of unlock-cascade achievement entries shipped at skeleton density. */
  unlockNodeCount: number;
}

export interface SurvivorData {
  weapons: WeaponDef[];
  passives: PassiveDef[];
  evolutions: EvolutionDef[];
  enemies: EnemyDef[];
  stages: StageDef[];
  powerUps: PowerUpDef[];
  characters: CharacterDef[];
  progression: SurvivorProgression;
  balance: SurvivorBalance;
}
