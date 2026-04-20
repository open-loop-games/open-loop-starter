import type { EnemyDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Baseline HP / speed / bounty per enemy. Only consulted when
// `combatSubstrate === 'wave-defender'`; `'none'` and `'pvp-auto-resolve'`
// forks leave this array empty or unused. `rounds.hpCurve` in
// `./rounds.ts` multiplies `EnemyDef.baseHp` for per-round escalation.

export const ENEMY_BASE_BOUNTY_SCALE = 1.0;

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// 5 enemy archetypes for the Defender-hybrid (`wave-defender`) substrate —
// grunt / fast / armoured / flying / boss. Arcane Tower Mage (§ 11 Theme B)
// costume baked inline; forks override names freely or replace the roster
// when `combatSubstrate !== 'wave-defender'`.

export const ENEMIES: EnemyDef[] = [
  // Grunt — cycle 1 baseline.
  {
    id: 'imp',
    name: 'Imp',
    baseHp: 60,
    baseSpeed: 1.0,
    unlockRound: 0,
    bounty: 3,
  },

  // Fast — high speed, low HP.
  {
    id: 'shade',
    name: 'Shade',
    baseHp: 40,
    baseSpeed: 2.2,
    unlockRound: 3,
    bounty: 4,
  },

  // Armoured — slow and tanky.
  {
    id: 'stone-troll',
    name: 'Stone Troll',
    baseHp: 200,
    baseSpeed: 0.7,
    unlockRound: 5,
    bounty: 10,
  },

  // Flying — bypasses ground-only defensive arrangements.
  {
    id: 'wraith',
    name: 'Wraith',
    baseHp: 90,
    baseSpeed: 1.5,
    unlockRound: 7,
    bounty: 8,
  },

  // Boss — large HP pool; appears every ~5 rounds.
  {
    id: 'demon-lord',
    name: 'Demon Lord',
    baseHp: 700,
    baseSpeed: 0.6,
    unlockRound: 9,
    bounty: 40,
  },
];

export const ENEMY_IDS = ENEMIES.map((e) => e.id) as readonly string[];
