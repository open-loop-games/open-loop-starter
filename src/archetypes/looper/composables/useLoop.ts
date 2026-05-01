/**
 * Vue bridge for the loop module.
 */

import {
  getLoop,
  getLoopCount,
  isLoopRunning,
  getElapsed,
  startLoop,
  pauseLoop,
  togglePause,
  manualRestart,
  getPauseBeforeRestart,
  getPauseOnFailedLoop,
  setGameSpeed,
  getGameSpeed,
  SPEED_OPTIONS,
  type SpeedMultiplier,
} from '../modules/loop';

export function useLoop() {
  return {
    /** Engine Loop instance */
    loop: getLoop(),
    /** Loop count (persistent ref) */
    loopCount: getLoopCount(),
    /** Is the loop currently running */
    isLoopRunning,
    /** Elapsed time in current loop (seconds) */
    getElapsed,
    /** Start ticking */
    startLoop,
    /** Pause ticking */
    pauseLoop,
    /** Toggle pause */
    togglePause,
    /** Manual restart (player-initiated) */
    manualRestart,
    /** Pause-before-restart toggle (persistent ref) */
    pauseBeforeRestart: getPauseBeforeRestart(),
    /** Pause-on-failed-loop toggle (persistent ref) */
    pauseOnFailedLoop: getPauseOnFailedLoop(),
    /** Set game speed multiplier */
    setGameSpeed,
    /** Get current speed multiplier */
    getGameSpeed,
    /** Available speed options */
    SPEED_OPTIONS,
  };
}

export type { SpeedMultiplier };
