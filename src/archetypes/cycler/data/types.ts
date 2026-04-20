import type { DecimalSource } from 'open-loop-engine';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Definition interfaces shared across all data files. Editing these shapes
// forks the archetype; tuning happens against the balance constants in the
// per-entity data files.
//
// Three structural-fork toggles live on `CyclerProgression`:
//   phaseCycleMode — 'day-night' (diegetic clock; Kingdom) vs 'round-timer'
//                    (explicit counter; Thronefall, Dome Keeper) vs
//                    'continuous-interrupt' (soft boundary; They Are Billions).
//   endgameMode    — 'open-ended' (cyclical-forever until fortress falls) vs
//                    'campaign-closure' (one-way macro terminator on top of
//                    the cyclical micro-loop; They Are Billions, 7 Days to Die).
//   prestigeMode   — 'none' (single run, no persistence) vs 'run-reset'
//                    (run-end meta-currency) vs 'campaign' (persistent
//                    campaign-map node unlocks).

export type PhaseId = 'build' | 'defend';

export type PhaseCycleMode = 'day-night' | 'round-timer' | 'continuous-interrupt';
export type EndgameMode = 'open-ended' | 'campaign-closure';
export type PrestigeMode = 'none' | 'run-reset' | 'campaign';

export type BuildingRole = 'income' | 'defense' | 'support' | 'infrastructure';

export interface BuildingDef {
  id: string;
  name: string;
  role: BuildingRole;
  /**
   * Per-phase contribution. A building may be `income`-role active only in
   * Phase A, `defense`-role active only in Phase B, or (for support /
   * infrastructure roles) contribute to both phases via separate entries.
   */
  phaseContribution: {
    build?: { goldPerTick?: DecimalSource; populationBonus?: DecimalSource };
    defend?: { damagePerSec?: DecimalSource; range?: number };
  };
  purchase: {
    baseCost: DecimalSource;
    costScaling: DecimalSource;
  };
  /** Optional adjacency-aura — composes Placement-Adjacency optionally. */
  adjacencyAura?: {
    radius: number;
    buff: {
      damageMul?: DecimalSource;
      incomeMul?: DecimalSource;
      rangeMul?: DecimalSource;
    };
  };
}

export interface EnemyDef {
  id: string;
  name: string;
  baseHp: DecimalSource;
  baseSpeed: number;
  /** Cycle index at which this enemy first appears. 0 = available from cycle 1. */
  unlockCycle: number;
  bounty: DecimalSource;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  targetBuildingId: string;
  tier: 1 | 2 | 3;
  cost: DecimalSource;
  effect: {
    damageMul?: DecimalSource;
    incomeMul?: DecimalSource;
    rangeMul?: DecimalSource;
  };
}

export interface CycleWave {
  enemyId: string;
  count: number;
  spawnIntervalSec: number;
}

export interface CycleEscalation {
  /**
   * Cycle-indexed HP-curve. Length = max cycle count; each element multiplies
   * EnemyDef.baseHp for that cycle's defend phase.
   */
  hpCurve: DecimalSource[];
  /** Per-cycle wave composition — length matches hpCurve. */
  waves: CycleWave[][];
  startingGold: DecimalSource;
}

export interface CyclerBalance {
  /** Applies when phaseCycleMode !== 'continuous-interrupt'. */
  buildPhaseDurationSec: DecimalSource;
  /** Applies when phaseCycleMode !== 'continuous-interrupt'. */
  defendPhaseDurationSec: DecimalSource;
  /** Income multiplier applied per cycle. Default 1.05 (modest compounding). */
  perCycleIncomeGrowth: DecimalSource;
  /** Enemy HP multiplier applied per cycle on top of hpCurve. Default 1.12. */
  perCycleEnemyHpGrowth: DecimalSource;
  /** Tier-N upgrade cost multiplier relative to tier-1. Default 2.5. */
  upgradeCostScaling: DecimalSource;
  adjacencyAuraStack: 'additive' | 'multiplicative';
  /** Only consulted when endgameMode === 'campaign-closure'. */
  campaignClosureCycle?: number;
}

export interface CyclerProgression {
  phaseCycleMode: PhaseCycleMode;
  endgameMode: EndgameMode;
  prestigeMode: PrestigeMode;
  /** 0 when prestigeMode === 'none'. */
  metaUpgradeNodeCount: number;
}

export interface CyclerData {
  buildings: BuildingDef[];
  enemies: EnemyDef[];
  upgrades: UpgradeDef[];
  cycles: CycleEscalation;
  progression: CyclerProgression;
  balance: CyclerBalance;
}
