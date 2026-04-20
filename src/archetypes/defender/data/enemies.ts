import type { EnemyDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Enemy HP/speed/bounty baselines. Wave-HP-curve multipliers live in
// `./stages.ts` and multiply `EnemyDef.baseHp` for each wave.

export const ENEMY_BASE_BOUNTY_SCALE = 1.0; // Forks scale bounty economy here.

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 4 enemy archetypes. Resistance matrix forces at least two tower-type
// purchases per stage (grunt dies to anything; armoured resists pierce;
// fast forces range/speed consideration; flying bypasses ground-only
// maze/towers when the maze-build modifier is on).

export const ENEMIES: EnemyDef[] = [
  // Grunt — baseline neutral-resistance melee.
  {
    id: 'grunt',
    name: 'Orc Grunt',
    baseHp: 100,
    baseSpeed: 1.0,
    resistances: {},
    bounty: 6,
  },

  // Armoured — physical/pierce-resistant, slow.
  {
    id: 'armoured',
    name: 'Troll',
    baseHp: 260,
    baseSpeed: 0.7,
    resistances: { physical: 0.5, pierce: 0.5 },
    bounty: 14,
  },

  // Fast — high-speed low-HP.
  {
    id: 'fast',
    name: 'Goblin Scout',
    baseHp: 60,
    baseSpeed: 2.2,
    resistances: {},
    bounty: 5,
  },

  // Flying — bypasses ground-only routing in maze-build mode.
  {
    id: 'flying',
    name: 'Wyvern',
    baseHp: 140,
    baseSpeed: 1.4,
    resistances: { splash: 0.5 },
    bounty: 12,
    flying: true,
  },
];

export const ENEMY_IDS = ENEMIES.map((e) => e.id) as readonly string[];
