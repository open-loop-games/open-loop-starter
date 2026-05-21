/**
 * Loop module — ties the restart sequence together.
 *
 * Each tick: drain mana. When mana depletes (or action queue exhausts), fire
 * the restart sequence: reset stats/resources/zones/queue/action-progress,
 * preserve talents/progressVar XP/loadouts via retention.
 *
 * Uses engine's createLoop for lifecycle (endCondition, thingsToReset,
 * onBeforeRestart, onRestart, loop counter, best time) and
 * createRetentionPolicy for declarative carryover.
 *
 * Reference: idleLoops/driver.js (tick loop, restart, prepareRestart),
 * idle-loops-ng/src/modules/loop.ts
 */

import {
  Decimal,
  type EngineModule,
  type EngineContext,
  type Loop,
  type TickDriver,
  createLoop,
  createRetentionPolicy,
  type RetentionPolicy,
  persistent,
  type Persistent,
  withPersistentContext,
  TickDriverKey,
} from '@open-loop/engine';
import { getMana, drainMana, resetMana } from './mana';
import { getStatLevelSkills } from './stats';
import { resetAllResources } from './resources';
import { restartZones, getProgressVarsForZone } from './zones';
import {
  restartActionQueue,
  bootstrapActiveFromSave,
  getLoadouts,
  getLoadoutNames,
  getActiveList,
} from './action-queue';
import {
  consumeRestartFlag,
  isRestartFlagged,
  basicCategory,
  progressCategory,
  regularCategory,
} from './action-runner';

// ============================================================================
// Module State
// ============================================================================

let loop: Loop;
let retention: RetentionPolicy;
let gameLoop: TickDriver;
let pauseBeforeRestart: Persistent<boolean>;
let pauseOnFailedLoop: Persistent<boolean>;

/** Available speed multipliers */
export const SPEED_OPTIONS = [1, 2, 5, 20] as const;
export type SpeedMultiplier = (typeof SPEED_OPTIONS)[number];

// ============================================================================
// Public API — loop access
// ============================================================================

/** Get the engine Loop instance */
export function getLoop(): Loop {
  return loop;
}

/** Get the loop count persistent ref */
export function getLoopCount(): Persistent<number> {
  return loop.count;
}

/** Whether the loop is currently running */
export function isLoopRunning(): boolean {
  return loop.running.value;
}

/** Get elapsed time in current loop (seconds) */
export function getElapsed(): number {
  return loop.elapsed.value;
}

// ============================================================================
// Public API — loop control
// ============================================================================

/**
 * Start the loop (begin ticking).
 */
export function startLoop(): void {
  bootstrapActiveFromSave();
  loop.run();
}

/**
 * Pause the loop.
 */
export function pauseLoop(): void {
  loop.pause();
}

/**
 * Toggle pause.
 */
export function togglePause(): void {
  if (loop.running.value) {
    loop.pause();
  } else {
    bootstrapActiveFromSave();
    loop.run();
  }
}

/**
 * Manual restart — player clicks restart button.
 */
export function manualRestart(): void {
  loop.end();
}

// ============================================================================
// Public API — pause settings
// ============================================================================

/** Get the pause-before-restart toggle (persistent ref) */
export function getPauseBeforeRestart(): Persistent<boolean> {
  return pauseBeforeRestart;
}

/** Get the pause-on-failed-loop toggle (persistent ref) */
export function getPauseOnFailedLoop(): Persistent<boolean> {
  return pauseOnFailedLoop;
}

// ============================================================================
// Public API — game speed
// ============================================================================

/**
 * Set game speed multiplier. Scales dt during live play via engine speedMultiplier.
 */
export function setGameSpeed(multiplier: SpeedMultiplier): void {
  gameLoop.speedMultiplier = multiplier;
}

/** Get current speed multiplier */
export function getGameSpeed(): SpeedMultiplier {
  const mult = gameLoop.speedMultiplier;
  if (mult >= 20) return 20;
  if (mult >= 5) return 5;
  if (mult >= 2) return 2;
  return 1;
}

// ============================================================================
// Restart Sequence
// ============================================================================

/**
 * Build the retention policy — declares what survives the reset.
 *
 * What persists:
 * - Town progress var exploration XP
 * - Loadout slots
 * - Loop counter + best time (handled by Loop internally)
 *
 * Talent skill XP isn't listed because talent skills aren't in
 * `thingsToReset` — they're never reset, so retention is unnecessary.
 */
function buildRetention(): RetentionPolicy {
  const keep: Persistent[] = [];

  // Town progress var XP — persists across loops
  for (const zoneId of ['beginnersville', 'forest-path'] as const) {
    for (const pv of getProgressVarsForZone(zoneId)) {
      keep.push(pv.skill.xp);
    }
  }

  // Loadouts — persist across loops
  keep.push(getLoadouts());
  keep.push(getLoadoutNames());

  return createRetentionPolicy({ keep });
}

// ============================================================================
// Module
// ============================================================================

export const loopModule: EngineModule = {
  id: 'loop',
  dependencies: ['stats', 'mana', 'resources', 'zones', 'action-queue'],
  install(ctx: EngineContext) {
    gameLoop = ctx.inject(TickDriverKey);

    ({ pauseBeforeRestart, pauseOnFailedLoop } = withPersistentContext('loop', () => ({
      pauseBeforeRestart: persistent(false, { name: 'pauseBeforeRestart' }),
      pauseOnFailedLoop: persistent(false, { name: 'pauseOnFailedLoop' }),
    })));

    let retentionBuilt = false;
    function ensureRetention(): void {
      if (!retentionBuilt) {
        retention = buildRetention();
        retentionBuilt = true;
      }
    }

    loop = createLoop({
      endCondition: () => Decimal.lte(getMana().value, 0) || isRestartFlagged(),

      thingsToReset: () => {
        // Stat-level SkillCategory resets each loop. Its `[Resettable]()` yields
        // each skill instance; the recursive walker resets `xp` (LevelDriven
        // mode has no other persistent ref). Talent SkillCategory is omitted
        // here — its xp survives across loops.
        //
        // Action-type categories: each entry's state holds `progress` and
        // `timesCompleted` Persistent refs that the walker zaps. progress
        // category's `gainChain` is walked but holds no Persistent refs, so
        // it survives untouched.
        return [getStatLevelSkills(), basicCategory, progressCategory, regularCategory];
      },

      onBeforeRestart: () => {
        ensureRetention();
        retention.snapshot();

        const shouldPause =
          (pauseBeforeRestart.value ||
            (pauseOnFailedLoop.value &&
              getActiveList().some(
                (item) => !!item.metadata.errorMessage || item.metadata.failedCount > 0,
              ))) &&
          loop.running.value;

        if (shouldPause) {
          loop.pause();
          retention.restore(); // undo snapshot — not resetting yet
          return false; // cancel the restart
        }
      },

      onRestart: () => {
        consumeRestartFlag();
        ensureRetention();
        retention.restore();
        resetMana();
        resetAllResources();
        restartZones();
        restartActionQueue();
      },

      registerTick: ctx.onTick,
    });

    // Per-tick: drain mana (tickRate * dt ≈ 1 per frame, scales with speed)
    ctx.onTick((dt: number) => {
      if (!loop.running.value) return;
      drainMana(Math.round(gameLoop.tickRate * dt));
    });
  },
};
