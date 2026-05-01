import type { EngineModule } from 'open-loop-engine';
import { manaModule } from './mana';
import { resourcesModule } from './resources';
import { statsModule } from './stats';
import { zonesModule } from './zones';
import { actionQueueModule } from './action-queue';
import { actionRunnerModule } from './action-runner';
import { loopModule } from './loop';

export { manaModule } from './mana';
export { resourcesModule } from './resources';
export { statsModule } from './stats';
export { zonesModule } from './zones';
export { actionQueueModule } from './action-queue';
export {
  actionRunnerModule,
  isActionVisible,
  getActionDef,
  initRunner,
  registerActions,
} from './action-runner';
export {
  loopModule,
  getLoop,
  getLoopCount,
  isLoopRunning,
  startLoop,
  pauseLoop,
  togglePause,
  manualRestart,
  setGameSpeed,
  getGameSpeed,
  SPEED_OPTIONS,
} from './loop';
export type { ProgressVarState, RegularVarState } from './zones';
export type { ActionMeta, LoadoutEntry } from './action-queue';
export type { StatState } from './stats';

/**
 * Compose the looper modules in dependency order:
 *
 *   mana → resources → stats → zones →
 *   action-queue → action-runner → loop
 *
 * The `action-runner` module declares its own dependencies so the engine
 * installs them in the right order. `initRunner()` and `registerActions()`
 * must be called from boot.ts after install.
 */
export function createLooperModules(): EngineModule[] {
  return [
    manaModule,
    resourcesModule,
    statsModule,
    zonesModule,
    actionQueueModule,
    actionRunnerModule,
    loopModule,
  ];
}
