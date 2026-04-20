import type { StageDef, WaveComposition } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Wave HP curve + composition for the skeleton's one default stage.
// 20 waves covers the 1–2h arc when `prestigeMode === 'none'`.

export const DEFAULT_WAVE_COUNT = 20;
export const DEFAULT_STARTING_CURRENCY = 200;

/**
 * HP curve — wave-N multiplier on EnemyDef.baseHp. Early waves ease the
 * player in (1.0×), mid-waves escalate (~1.5×), late waves pressure
 * upgrade purchases (~3×).
 */
const HP_CURVE_20_WAVE: number[] = [
  1.0,
  1.1,
  1.2,
  1.3,
  1.5, // waves 1–5
  1.6,
  1.8,
  2.0,
  2.2,
  2.5, // waves 6–10
  2.7,
  3.0,
  3.3,
  3.6,
  4.0, // waves 11–15
  4.5,
  5.0,
  5.6,
  6.2,
  7.0, // waves 16–20
];

/**
 * Wave composition — per-wave enemy lists. Skeleton demonstrates the
 * archetype's tension escalation (grunt → armoured → flying → mixed).
 * Forks extend/replace by wave-count or composition.
 */
const WAVES_20: WaveComposition[][] = [
  // Waves 1–3: grunt only (onboarding).
  [{ enemyId: 'grunt', count: 8, spawnIntervalSec: 1.5 }],
  [{ enemyId: 'grunt', count: 12, spawnIntervalSec: 1.3 }],
  [{ enemyId: 'grunt', count: 16, spawnIntervalSec: 1.2 }],

  // Waves 4–6: fast introduced, forces speed consideration.
  [
    { enemyId: 'grunt', count: 10, spawnIntervalSec: 1.2 },
    { enemyId: 'fast', count: 4, spawnIntervalSec: 0.8 },
  ],
  [
    { enemyId: 'grunt', count: 8, spawnIntervalSec: 1.0 },
    { enemyId: 'fast', count: 8, spawnIntervalSec: 0.8 },
  ],
  [{ enemyId: 'fast', count: 20, spawnIntervalSec: 0.6 }],

  // Waves 7–10: armoured introduced, forces magic/splash purchase.
  [
    { enemyId: 'grunt', count: 6, spawnIntervalSec: 1.2 },
    { enemyId: 'armoured', count: 3, spawnIntervalSec: 2.0 },
  ],
  [
    { enemyId: 'armoured', count: 6, spawnIntervalSec: 1.8 },
    { enemyId: 'fast', count: 6, spawnIntervalSec: 0.8 },
  ],
  [
    { enemyId: 'grunt', count: 8, spawnIntervalSec: 1.0 },
    { enemyId: 'armoured', count: 4, spawnIntervalSec: 1.8 },
    { enemyId: 'fast', count: 4, spawnIntervalSec: 0.8 },
  ],
  [{ enemyId: 'armoured', count: 12, spawnIntervalSec: 1.5 }],

  // Waves 11–14: flying introduced.
  [
    { enemyId: 'grunt', count: 8, spawnIntervalSec: 1.0 },
    { enemyId: 'flying', count: 4, spawnIntervalSec: 1.5 },
  ],
  [
    { enemyId: 'flying', count: 8, spawnIntervalSec: 1.0 },
    { enemyId: 'fast', count: 8, spawnIntervalSec: 0.6 },
  ],
  [
    { enemyId: 'armoured', count: 5, spawnIntervalSec: 1.6 },
    { enemyId: 'flying', count: 5, spawnIntervalSec: 1.2 },
  ],
  [
    { enemyId: 'grunt', count: 10, spawnIntervalSec: 0.9 },
    { enemyId: 'armoured', count: 4, spawnIntervalSec: 1.8 },
    { enemyId: 'flying', count: 4, spawnIntervalSec: 1.5 },
  ],

  // Waves 15–19: mixed pressure waves.
  [
    { enemyId: 'grunt', count: 12, spawnIntervalSec: 0.8 },
    { enemyId: 'fast', count: 10, spawnIntervalSec: 0.6 },
    { enemyId: 'armoured', count: 4, spawnIntervalSec: 1.8 },
  ],
  [
    { enemyId: 'armoured', count: 8, spawnIntervalSec: 1.5 },
    { enemyId: 'flying', count: 8, spawnIntervalSec: 1.0 },
  ],
  [
    { enemyId: 'fast', count: 20, spawnIntervalSec: 0.5 },
    { enemyId: 'flying', count: 5, spawnIntervalSec: 1.5 },
  ],
  [
    { enemyId: 'grunt', count: 15, spawnIntervalSec: 0.8 },
    { enemyId: 'armoured', count: 8, spawnIntervalSec: 1.4 },
    { enemyId: 'flying', count: 6, spawnIntervalSec: 1.2 },
  ],
  [
    { enemyId: 'armoured', count: 12, spawnIntervalSec: 1.3 },
    { enemyId: 'fast', count: 12, spawnIntervalSec: 0.6 },
    { enemyId: 'flying', count: 8, spawnIntervalSec: 1.0 },
  ],

  // Wave 20: boss wave — massed composition, high count.
  [
    { enemyId: 'grunt', count: 20, spawnIntervalSec: 0.6 },
    { enemyId: 'armoured', count: 10, spawnIntervalSec: 1.2 },
    { enemyId: 'fast', count: 15, spawnIntervalSec: 0.5 },
    { enemyId: 'flying', count: 10, spawnIntervalSec: 1.0 },
  ],
];

// ─── Skeleton + Costume ────────────────────────────────────────────────────
// One default stage. Forks add stages by appending to the array; when
// `prestigeMode === 'campaign'` the stage sequence is the campaign.

export const STAGES: StageDef[] = [
  {
    id: 'frontier-pass',
    name: 'Frontier Pass',
    hpCurve: HP_CURVE_20_WAVE,
    waves: WAVES_20,
    startingCurrency: DEFAULT_STARTING_CURRENCY,
  },
];
