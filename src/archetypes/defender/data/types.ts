import type { DecimalSource } from 'open-loop-engine';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Definition interfaces shared across all data files. Editing these shapes
// forks the archetype; tuning happens against the balance constants in the
// per-entity data files.

export type DamageType = 'physical' | 'magic' | 'splash' | 'pierce';

export interface DefenderDef {
  id: string;
  name: string;
  baseDamage: DecimalSource;
  baseRange: number;
  baseAttackSpeed: DecimalSource;
  damageType: DamageType;
  purchase: {
    baseCost: DecimalSource;
    costScaling: DecimalSource;
  };
  /** Optional adjacency-aura: buffs neighbours within N cells. */
  adjacencyAura?: {
    radius: number;
    buff: {
      damageMul?: DecimalSource;
      rangeMul?: DecimalSource;
      speedMul?: DecimalSource;
    };
  };
}

export interface EnemyDef {
  id: string;
  name: string;
  baseHp: DecimalSource;
  baseSpeed: number;
  /** Resistance multipliers against damage types. 1.0 = neutral; 0.5 = resist; 0 = immune. */
  resistances: Partial<Record<DamageType, DecimalSource>>;
  bounty: DecimalSource;
  flying?: boolean;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  targetDefenderId: string;
  tier: 1 | 2 | 3;
  cost: DecimalSource;
  effect: {
    damageMul?: DecimalSource;
    rangeMul?: DecimalSource;
    speedMul?: DecimalSource;
  };
}

export interface WaveComposition {
  enemyId: string;
  count: number;
  spawnIntervalSec: number;
}

export interface StageDef {
  id: string;
  name: string;
  /** Wave-HP multiplier curve. Length = waveCount; each element multiplies EnemyDef.baseHp for that wave. */
  hpCurve: DecimalSource[];
  /** Per-wave enemy composition. Length = waveCount. */
  waves: WaveComposition[][];
  startingCurrency: DecimalSource;
}

export interface DefenderBalance {
  waveEndBountyBonus: DecimalSource;
  stageClearMetaReward: DecimalSource;
  upgradeCostScaling: DecimalSource;
  adjacencyAuraStack: 'additive' | 'multiplicative';
}

export type PrestigeMode = 'none' | 'run-reset' | 'campaign';

export interface DefenderProgression {
  prestigeMode: PrestigeMode;
  metaUpgradeNodeCount: number;
  campaignNodeCount?: number;
}

export interface DefenderData {
  defenders: DefenderDef[];
  enemies: EnemyDef[];
  upgrades: UpgradeDef[];
  stages: StageDef[];
  progression: DefenderProgression;
  balance: DefenderBalance;
}
