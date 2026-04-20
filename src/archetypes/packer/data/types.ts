import type { DecimalSource } from 'open-loop-engine';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Definition interfaces shared across all data files. Editing these shapes
// forks the archetype; tuning happens against the balance constants in the
// per-entity data files.
//
// Three structural-fork toggles live on `PackerProgression`:
//   spatialMode       — '2d-inventory' (Backpack Battles; heterogeneous
//                       footprints + rotation) vs '1d-slot' (Super Auto Pets
//                       degenerate; single ordered sequence) vs
//                       'gem-assignment' (GemCraft / Gem TD; typed slots
//                       receive items by assignment rather than spatial
//                       footprint).
//   combatSubstrate   — 'none' (score-only; Industry Idle building-grid form)
//                       vs 'wave-defender' (enemies traverse a path past the
//                       arrangement; GemCraft / Gem TD) vs 'pvp-auto-resolve'
//                       (two arrangements fight; HP-ladder attrition;
//                       Backpack Battles).
//   prestigeMode      — 'none' (single run) vs 'run-reset' (run-end
//                       meta-currency) vs 'campaign' (campaign-node unlocks).

export type SpatialMode = '2d-inventory' | '1d-slot' | 'gem-assignment';

export type CombatSubstrate = 'none' | 'wave-defender' | 'pvp-auto-resolve';

export type PrestigeMode = 'none' | 'run-reset' | 'campaign';

export type ItemCategory = 'weapon' | 'armor' | 'trinket' | 'consumable' | 'gem' | 'utility';

export type SynergyPredicate =
  | { kind: 'same-category'; category: ItemCategory }
  | { kind: 'same-type'; itemId: string }
  | { kind: 'same-colour'; colour: string }
  | { kind: 'named-pair'; neighbourItemId: string }
  | { kind: 'any-occupied' };

export interface AdjacencyRule {
  predicate: SynergyPredicate;
  bonus: {
    damageMul?: DecimalSource;
    outputMul?: DecimalSource;
    flatDamage?: DecimalSource;
  };
  /** Maximum neighbours counted for this rule (diminishing-returns cap). */
  maxStack?: number;
}

export interface CombineRule {
  /** Copies required to merge into a higher-grade occupant. Typically 3. */
  copiesRequired: number;
  /** Max grade reachable via combine-up. */
  maxGrade: number;
  /**
   * Per-grade multiplier on baseOutput + chain. Length = maxGrade; entry 0
   * is the grade-1 baseline (1.0), entry 1 is grade-2 multiplier, etc.
   */
  gradeMultiplier: DecimalSource[];
}

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  /**
   * 2D footprint as cell offsets from the item's anchor cell. Only consulted
   * when `SpatialMode === '2d-inventory'`. Single-cell: [[0,0]]. L-shaped:
   * [[0,0],[1,0],[1,1]]. For '1d-slot' the item implicitly occupies one
   * slot; for 'gem-assignment' the item is slotted by assignment and carries
   * no grid footprint.
   */
  footprint: Array<[number, number]>;
  /** Base output at grade 1 with no neighbour bonuses. */
  baseOutput: {
    damagePerTick?: DecimalSource;
    goldPerTick?: DecimalSource;
    healPerTick?: DecimalSource;
    scoreContribution?: DecimalSource;
  };
  adjacencyRules: AdjacencyRule[];
  combineRule?: CombineRule;
  baseCost: DecimalSource;
}

export interface EnemyDef {
  id: string;
  name: string;
  baseHp: DecimalSource;
  baseSpeed: number;
  /** Wave / round index at which this enemy first appears. */
  unlockRound: number;
  bounty: DecimalSource;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Scope: category-wide or per-item. */
  scope: { kind: 'category'; category: ItemCategory } | { kind: 'item'; itemId: string };
  tier: 1 | 2 | 3;
  cost: DecimalSource;
  effect: {
    outputMul?: DecimalSource;
    adjacencyRadiusMul?: DecimalSource;
    bonusMul?: DecimalSource;
  };
}

export interface ShopConfig {
  /** Number of slots presented per round. Indexed by shop tier. */
  slotsPerRound: number[];
  /** Reroll cost in gold; may escalate within a round. */
  rerollCostSchedule: DecimalSource[];
  /** Sell value as fraction of purchase price. */
  sellValueFraction: DecimalSource;
  /** Per-round interest on unspent gold; typically small or zero. */
  interestPerUnit?: DecimalSource;
  interestCap?: DecimalSource;
}

export interface RoundEscalation {
  /** Round-indexed HP-curve. Length = max round / wave count. */
  hpCurve: DecimalSource[];
  /** Per-round gold income schedule. */
  goldPerRound: DecimalSource[];
  startingGold: DecimalSource;
  /**
   * Wave composition — only consulted when combatSubstrate === 'wave-defender'.
   * Outer index = round; inner = enemies + counts + spawn interval.
   */
  waves?: Array<{ enemyId: string; count: number; spawnIntervalSec: number }>[];
}

export interface PackerBalance {
  /** Grid dimensions when spatialMode === '2d-inventory'. */
  gridRows: number;
  gridCols: number;
  /** Slot count when spatialMode === '1d-slot'. */
  slotCount?: number;
  /** Typed slot configuration when spatialMode === 'gem-assignment'. */
  assignmentSlots?: Array<{ type: string; count: number }>;
  /** Primary balance lever — per-neighbour stacking rule. */
  adjacencyStackMode: 'additive' | 'multiplicative';
  defaultMaxStack: number;
  /** Combine-up XP curve — copies required to reach grade N. */
  combineCopiesByGrade: number[];
  /** Shop tier unlock schedule — what round unlocks shop tier K. */
  shopTierUnlockRound: number[];
}

export interface PackerProgression {
  spatialMode: SpatialMode;
  combatSubstrate: CombatSubstrate;
  prestigeMode: PrestigeMode;
  /** 0 when prestigeMode === 'none'. */
  metaUpgradeNodeCount: number;
  /** 1 when the archetype ships without hero selection. */
  heroCount: number;
}

export interface PackerData {
  items: ItemDef[];
  /** Empty array when combatSubstrate === 'none' or 'pvp-auto-resolve'. */
  enemies: EnemyDef[];
  upgrades: UpgradeDef[];
  shop: ShopConfig;
  rounds: RoundEscalation;
  progression: PackerProgression;
  balance: PackerBalance;
}
