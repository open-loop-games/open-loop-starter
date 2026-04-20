import type { EnemyDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Enemy HP/speed/XP baselines. The stage HP-curve in `./stages.ts` multiplies
// `EnemyDef.baseHp` by a per-minute schedule. Gold drop is stochastic per
// kill; early runs with no Greed Power-Up accrue meta-currency slowly.

export const ENEMY_BASE_XP_SCALE = 1.0; // Forks scale overall XP economy here.
export const ENEMY_BASE_GOLD_SCALE = 1.0; // Forks scale overall gold economy here.

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 6 enemy archetypes. Composition forces real mid-run positioning decisions:
// swarm + runner cover pressure-density; brute + elite force weapon choices;
// boss drops chests (evolution triggers). Gothic horror theme baked inline.

export const ENEMIES: EnemyDef[] = [
  // Grunt — baseline.
  {
    id: 'bat',
    name: 'Bat',
    baseHp: 8,
    baseSpeed: 1.4,
    xpGemValue: 1,
    goldDropChance: 0.02,
  },

  // Runner — fast, low HP; density-pressure.
  {
    id: 'zombie',
    name: 'Zombie',
    baseHp: 15,
    baseSpeed: 0.9,
    xpGemValue: 2,
    goldDropChance: 0.03,
  },

  // Brute — slow, tanky; forces damage weapons.
  {
    id: 'skeleton',
    name: 'Skeleton',
    baseHp: 45,
    baseSpeed: 1.0,
    xpGemValue: 5,
    goldDropChance: 0.05,
  },

  // Swarm — tiny; clusters in dense packs.
  {
    id: 'plant',
    name: 'Man-Eater Plant',
    baseHp: 25,
    baseSpeed: 0.7,
    xpGemValue: 3,
    goldDropChance: 0.04,
  },

  // Elite — mid-run difficulty spike; higher XP payout.
  {
    id: 'elite-zombie',
    name: 'Elite Zombie',
    baseHp: 150,
    baseSpeed: 1.1,
    xpGemValue: 15,
    goldDropChance: 0.15,
  },

  // Boss — roaming; drops chests (evolution triggers).
  {
    id: 'beholder',
    name: 'Beholder',
    baseHp: 1500,
    baseSpeed: 0.8,
    xpGemValue: 100,
    goldDropChance: 1.0,
    boss: true,
  },
];

export const ENEMY_IDS = ENEMIES.map((e) => e.id) as readonly string[];
