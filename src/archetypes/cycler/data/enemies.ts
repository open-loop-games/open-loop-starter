import type { EnemyDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Baseline HP / speed / bounty per enemy. Cycle-N HP multiplier lives in
// `./cycles.ts` and multiplies `EnemyDef.baseHp`; `perCycleEnemyHpGrowth`
// in `./progression.ts` layers a compounding multiplier on top.

export const ENEMY_BASE_BOUNTY_SCALE = 1.0;

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 5 enemy archetypes with cycle-indexed unlocks forcing composition
// changes across the arc. Day/Night Kingdom theme baked inline.

export const ENEMIES: EnemyDef[] = [
  // Grunt — baseline neutral, cycle 1.
  {
    id: 'greedling',
    name: 'Greedling',
    baseHp: 80,
    baseSpeed: 1.0,
    unlockCycle: 0,
    bounty: 4,
  },

  // Armoured — slow, resistant-feeling (raw HP up rather than damage
  // resistances since Cycler's skeleton does not carry damage-type
  // resistance tables — forks that want them can extend EnemyDef).
  {
    id: 'minion',
    name: 'Minion',
    baseHp: 220,
    baseSpeed: 0.7,
    unlockCycle: 2,
    bounty: 10,
  },

  // Fast — high speed, low HP, forces multiple defender types.
  {
    id: 'breeder',
    name: 'Breeder',
    baseHp: 60,
    baseSpeed: 2.0,
    unlockCycle: 4,
    bounty: 6,
  },

  // Boss — large HP pool every ~5 cycles.
  {
    id: 'boss-lurker',
    name: 'Boss Lurker',
    baseHp: 800,
    baseSpeed: 0.6,
    unlockCycle: 7,
    bounty: 50,
  },

  // Elite — late-cycle composition-breaker.
  {
    id: 'lurker',
    name: 'Lurker',
    baseHp: 400,
    baseSpeed: 1.1,
    unlockCycle: 11,
    bounty: 18,
  },
];

export const ENEMY_IDS = ENEMIES.map((e) => e.id) as readonly string[];
