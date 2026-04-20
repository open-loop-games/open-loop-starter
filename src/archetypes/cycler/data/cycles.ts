import type { CycleEscalation, CycleWave } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Cycle-indexed wave HP curve + composition. 15 cycles covers the 1–2h arc
// for `endgameMode === 'open-ended'`; `campaign-closure` variants set
// `campaignClosureCycle` in balance to a concrete terminator (15–25
// typical). HP curve is the per-cycle multiplier on EnemyDef.baseHp;
// `perCycleEnemyHpGrowth` in progression layers compounding on top.

export const DEFAULT_CYCLE_COUNT = 15;
export const DEFAULT_STARTING_GOLD = 150;

const HP_CURVE_15_CYCLE: number[] = [
  1.0,
  1.1,
  1.25,
  1.4,
  1.6, // cycles 1–5
  1.8,
  2.05,
  2.3,
  2.6,
  2.95, // cycles 6–10
  3.35,
  3.8,
  4.3,
  4.85,
  5.5, // cycles 11–15
];

/**
 * Per-cycle wave composition — what enemies arrive during each defend
 * phase. Composition follows the enemy `unlockCycle` gates:
 *   cycle 1–2  : greedlings only (onboarding)
 *   cycle 3–4  : greedlings + minions (first armoured pressure)
 *   cycle 5–7  : + breeders (speed consideration)
 *   cycle 8+   : boss-lurker every ~4 cycles
 *   cycle 12+  : + lurkers (elite composition-breakers)
 */
const WAVES_15: CycleWave[][] = [
  [{ enemyId: 'greedling', count: 10, spawnIntervalSec: 1.5 }],
  [{ enemyId: 'greedling', count: 16, spawnIntervalSec: 1.3 }],
  [
    { enemyId: 'greedling', count: 10, spawnIntervalSec: 1.2 },
    { enemyId: 'minion', count: 3, spawnIntervalSec: 2.0 },
  ],
  [
    { enemyId: 'greedling', count: 8, spawnIntervalSec: 1.0 },
    { enemyId: 'minion', count: 5, spawnIntervalSec: 1.8 },
  ],
  [
    { enemyId: 'greedling', count: 10, spawnIntervalSec: 1.0 },
    { enemyId: 'minion', count: 4, spawnIntervalSec: 1.8 },
    { enemyId: 'breeder', count: 4, spawnIntervalSec: 0.8 },
  ],
  [
    { enemyId: 'minion', count: 8, spawnIntervalSec: 1.5 },
    { enemyId: 'breeder', count: 6, spawnIntervalSec: 0.7 },
  ],
  [
    { enemyId: 'greedling', count: 12, spawnIntervalSec: 0.9 },
    { enemyId: 'minion', count: 6, spawnIntervalSec: 1.4 },
    { enemyId: 'breeder', count: 6, spawnIntervalSec: 0.7 },
  ],
  // Cycle 8 — first boss cycle.
  [
    { enemyId: 'minion', count: 10, spawnIntervalSec: 1.2 },
    { enemyId: 'breeder', count: 6, spawnIntervalSec: 0.6 },
    { enemyId: 'boss-lurker', count: 1, spawnIntervalSec: 0 },
  ],
  [
    { enemyId: 'greedling', count: 14, spawnIntervalSec: 0.8 },
    { enemyId: 'minion', count: 8, spawnIntervalSec: 1.2 },
    { enemyId: 'breeder', count: 8, spawnIntervalSec: 0.6 },
  ],
  [
    { enemyId: 'minion', count: 12, spawnIntervalSec: 1.1 },
    { enemyId: 'breeder', count: 10, spawnIntervalSec: 0.5 },
  ],
  [
    { enemyId: 'greedling', count: 16, spawnIntervalSec: 0.7 },
    { enemyId: 'minion', count: 10, spawnIntervalSec: 1.0 },
    { enemyId: 'breeder', count: 10, spawnIntervalSec: 0.5 },
  ],
  // Cycle 12 — elite composition-breaker appears.
  [
    { enemyId: 'minion', count: 10, spawnIntervalSec: 1.0 },
    { enemyId: 'breeder', count: 10, spawnIntervalSec: 0.5 },
    { enemyId: 'lurker', count: 3, spawnIntervalSec: 1.5 },
    { enemyId: 'boss-lurker', count: 1, spawnIntervalSec: 0 },
  ],
  [
    { enemyId: 'greedling', count: 18, spawnIntervalSec: 0.6 },
    { enemyId: 'minion', count: 12, spawnIntervalSec: 0.9 },
    { enemyId: 'lurker', count: 4, spawnIntervalSec: 1.3 },
  ],
  [
    { enemyId: 'minion', count: 14, spawnIntervalSec: 0.9 },
    { enemyId: 'breeder', count: 14, spawnIntervalSec: 0.4 },
    { enemyId: 'lurker', count: 5, spawnIntervalSec: 1.2 },
  ],
  // Cycle 15 — final wave shape (both open-ended equilibrium and
  // campaign-closure terminators land here by default).
  [
    { enemyId: 'greedling', count: 24, spawnIntervalSec: 0.5 },
    { enemyId: 'minion', count: 16, spawnIntervalSec: 0.8 },
    { enemyId: 'breeder', count: 16, spawnIntervalSec: 0.4 },
    { enemyId: 'lurker', count: 8, spawnIntervalSec: 1.0 },
    { enemyId: 'boss-lurker', count: 2, spawnIntervalSec: 3.0 },
  ],
];

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Single CycleEscalation — the skeleton ships one arc shape. Forks
// override the curves and wave composition to retune pacing without
// touching the module layer.

export const DEFAULT_CYCLES: CycleEscalation = {
  hpCurve: HP_CURVE_15_CYCLE,
  waves: WAVES_15,
  startingGold: DEFAULT_STARTING_GOLD,
};
