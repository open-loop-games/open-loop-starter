import type { StageDef } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// One default stage with a 30-minute continuous schedule (Vampire Survivors
// Mad Forest baseline). The HP curve scales enemy HP from 1.0× at 0:00 to
// ~50× at minute 29, matching VS's single-digit-to-millions scaling arc
// under default Curse.

export const DEFAULT_RUN_DURATION_MINUTES = 30;

/** Per-minute HP multiplier on EnemyDef.baseHp. Length = runDurationMinutes. */
const HP_CURVE_30_MIN: number[] = [
  1.0,
  1.1,
  1.3,
  1.5,
  1.8, // 0–4
  2.2,
  2.6,
  3.2,
  4.0,
  5.0, // 5–9
  6.3,
  7.8,
  9.5,
  11.5,
  14.0, // 10–14
  17.0,
  20.5,
  24.5,
  29.0,
  34.0, // 15–19
  40.0,
  47.0,
  55.0,
  64.0,
  74.0, // 20–24
  85.0,
  97.0,
  110.0,
  125.0,
  140.0, // 25–29
];

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// Mad-Forest-shape enemy composition schedule. Enemy density accumulates:
// each `add` entry adds to the spawning pool rather than replacing it.
// Gothic horror theme baked inline.

export const STAGES: StageDef[] = [
  {
    id: 'mad-forest',
    name: 'Mad Forest',
    runDurationMinutes: DEFAULT_RUN_DURATION_MINUTES,
    hpCurve: HP_CURVE_30_MIN,
    waveSchedule: [
      { minuteMark: 0, add: [{ enemyId: 'bat', density: 2.0 }] },
      { minuteMark: 2, add: [{ enemyId: 'zombie', density: 1.5 }] },
      { minuteMark: 4, add: [{ enemyId: 'plant', density: 2.0 }] },
      { minuteMark: 6, add: [{ enemyId: 'skeleton', density: 1.0 }] },
      { minuteMark: 8, add: [{ enemyId: 'elite-zombie', density: 0.5 }] },
      { minuteMark: 15, add: [{ enemyId: 'bat', density: 4.0 }] },
      { minuteMark: 20, add: [{ enemyId: 'skeleton', density: 2.0 }] },
      { minuteMark: 25, add: [{ enemyId: 'elite-zombie', density: 2.0 }] },
      { minuteMark: 28, add: [{ enemyId: 'plant', density: 4.0 }] },
    ],
    bossSchedule: [
      { minuteMark: 10, enemyId: 'beholder' },
      { minuteMark: 20, enemyId: 'beholder' },
    ],
  },
];

export const STAGE_IDS = STAGES.map((s) => s.id) as readonly string[];
