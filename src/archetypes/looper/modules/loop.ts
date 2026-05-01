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
  type GameLoop,
  createLoop,
  createRetentionPolicy,
  type RetentionPolicy,
  persistent,
  type Persistent,
  withPersistentContext,
  GameLoopKey,
} from 'open-loop-engine';
import { getMana, drainMana, resetMana } from './mana';
import { getAllStatStates } from './stats';
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
  setCanTick,
  setLoopCountGetter,
  resetAllActionProgress,
  consumeRestartFlag,
  isRestartFlagged,
} from './action-runner';

// ============================================================================
// Module State
// ============================================================================

let loop: Loop;
let retention: RetentionPolicy;
let gameLoop: GameLoop;
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
 * - Stat talent XP (accumulates 1% per XP gain, never reset)
 * - Town progress var exploration XP
 * - Loadout slots
 * - Loop counter + best time (handled by Loop internally)
 */
function buildRetention(): RetentionPolicy {
  const keep: Persistent[] = [];

  // Stat talent XP — persists across loops
  for (const state of getAllStatStates().values()) {
    keep.push(state.talentXP);
  }

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
    gameLoop = ctx.inject(GameLoopKey);

    ({ pauseBeforeRestart, pauseOnFailedLoop } = withPersistentContext('loop', () => ({
      pauseBeforeRestart: persistent(false),
      pauseOnFailedLoop: persistent(false),
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
        const things: unknown[] = [];
        // Stat XP resources reset each loop (talent XP is retained)
        for (const state of getAllStatStates().values()) {
          things.push(state.xp);
        }
        return things;
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
        resetAllActionProgress();
      },

      registerTick: ctx.onTick,
    });

    // Gate action progress on loop.running
    setCanTick(() => loop.running.value);

    // Wire loop count into action-runner for prereq evaluation
    setLoopCountGetter(() => loop.count.value);

    // Per-tick: drain mana (tickRate * dt ≈ 1 per frame, scales with speed)
    ctx.onTick((dt: number) => {
      if (!loop.running.value) return;
      drainMana(Math.round(gameLoop.tickRate * dt));
    });
  },
};
