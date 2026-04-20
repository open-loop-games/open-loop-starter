import type { RoundEscalation } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Round-indexed HP curve + per-round gold schedule. 12 rounds covers the
// 1–2h arc for `combatSubstrate === 'pvp-auto-resolve'` (typical Backpack
// Battles match length), and 10 waves covers the `wave-defender` Defender-
// hybrid form. HP curve is the per-round multiplier on `EnemyDef.baseHp`
// (wave-defender) or on opponent-HP-pool (pvp-auto-resolve).

export const DEFAULT_ROUND_COUNT = 12;
export const DEFAULT_STARTING_GOLD = 8;

const HP_CURVE_12: number[] = [
  1.0,
  1.15,
  1.3,
  1.5, // rounds 1–4
  1.75,
  2.0,
  2.3,
  2.65, // rounds 5–8
  3.05,
  3.5,
  4.0,
  4.6, // rounds 9–12
];

const GOLD_PER_ROUND_12: number[] = [
  4,
  5,
  6,
  7, // rounds 1–4
  8,
  9,
  10,
  10, // rounds 5–8
  10,
  10,
  10,
  10, // rounds 9–12 (caps at round 8 baseline; interest mechanics belong to Auto-battler)
];

/**
 * Per-round wave composition — only consulted when `combatSubstrate ===
 * 'wave-defender'`. Composition follows enemy `unlockRound` gates:
 *   round 1–2 : imp only (onboarding)
 *   round 3–4 : imp + shade (speed consideration)
 *   round 5–6 : + stone-troll (armoured pressure)
 *   round 7+  : + wraith (flying bypass threat)
 *   round 9+  : + demon-lord (boss composition)
 * `pvp-auto-resolve` and `'none'` forks leave this undefined.
 */
const WAVES_12: Array<{ enemyId: string; count: number; spawnIntervalSec: number }>[] = [
  [{ enemyId: 'imp', count: 8, spawnIntervalSec: 1.5 }],
  [{ enemyId: 'imp', count: 12, spawnIntervalSec: 1.3 }],
  [
    { enemyId: 'imp', count: 10, spawnIntervalSec: 1.2 },
    { enemyId: 'shade', count: 3, spawnIntervalSec: 0.8 },
  ],
  [
    { enemyId: 'imp', count: 12, spawnIntervalSec: 1.0 },
    { enemyId: 'shade', count: 5, spawnIntervalSec: 0.7 },
  ],
  [
    { enemyId: 'imp', count: 8, spawnIntervalSec: 1.0 },
    { enemyId: 'shade', count: 6, spawnIntervalSec: 0.7 },
    { enemyId: 'stone-troll', count: 2, spawnIntervalSec: 2.2 },
  ],
  [
    { enemyId: 'shade', count: 8, spawnIntervalSec: 0.6 },
    { enemyId: 'stone-troll', count: 4, spawnIntervalSec: 2.0 },
  ],
  [
    { enemyId: 'imp', count: 14, spawnIntervalSec: 0.9 },
    { enemyId: 'stone-troll', count: 4, spawnIntervalSec: 1.8 },
    { enemyId: 'wraith', count: 3, spawnIntervalSec: 1.2 },
  ],
  [
    { enemyId: 'stone-troll', count: 6, spawnIntervalSec: 1.5 },
    { enemyId: 'wraith', count: 5, spawnIntervalSec: 1.0 },
  ],
  // Round 9 — first boss arrives.
  [
    { enemyId: 'shade', count: 10, spawnIntervalSec: 0.5 },
    { enemyId: 'stone-troll', count: 6, spawnIntervalSec: 1.5 },
    { enemyId: 'demon-lord', count: 1, spawnIntervalSec: 0 },
  ],
  [
    { enemyId: 'imp', count: 18, spawnIntervalSec: 0.7 },
    { enemyId: 'wraith', count: 6, spawnIntervalSec: 0.9 },
  ],
  [
    { enemyId: 'stone-troll', count: 8, spawnIntervalSec: 1.3 },
    { enemyId: 'wraith', count: 8, spawnIntervalSec: 0.8 },
    { enemyId: 'demon-lord', count: 1, spawnIntervalSec: 0 },
  ],
  // Round 12 — final composition.
  [
    { enemyId: 'imp', count: 22, spawnIntervalSec: 0.5 },
    { enemyId: 'shade', count: 12, spawnIntervalSec: 0.4 },
    { enemyId: 'stone-troll', count: 10, spawnIntervalSec: 1.0 },
    { enemyId: 'wraith', count: 10, spawnIntervalSec: 0.7 },
    { enemyId: 'demon-lord', count: 2, spawnIntervalSec: 4.0 },
  ],
];

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Single RoundEscalation — the skeleton ships one arc shape. Forks override
// curves + wave composition in place. `waves` is populated for forks that
// ship with `combatSubstrate === 'wave-defender'` (Arcane Tower Mage theme);
// `'none'` and `'pvp-auto-resolve'` forks may leave waves defined but
// unused by the module layer.

export const DEFAULT_ROUNDS: RoundEscalation = {
  hpCurve: HP_CURVE_12,
  goldPerRound: GOLD_PER_ROUND_12,
  startingGold: DEFAULT_STARTING_GOLD,
  waves: WAVES_12,
};
