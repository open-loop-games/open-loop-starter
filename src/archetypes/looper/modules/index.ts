import type { EngineModule } from '@open-loop/engine';
import { tuningModule } from './tuning';
import { manaModule } from './mana';
import { resourcesModule } from './resources';
import { statsModule } from './stats';
import { zonesModule } from './zones';
import { actionQueueModule } from './action-queue';
import { actionRunnerModule } from './action-runner';
import { loopModule } from './loop';

export { tuningModule, LooperTuningRegistryKey, type LooperTunableKey } from './tuning';
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

/**
 * Compose the looper modules in dependency order:
 *
 *   mana → resources → stats → zones →
 *   action-queue → loop → action-runner
 *
 * Each module declares its own `dependencies` so the engine installs them
 * in the right order regardless of array position. `action-runner` depends
 * on `loop` so `getLoop()` returns a live handle at install time.
 */
export function createLooperModules(): EngineModule[] {
  return [
    tuningModule,
    manaModule,
    resourcesModule,
    statsModule,
    zonesModule,
    actionQueueModule,
    loopModule,
    actionRunnerModule,
  ];
}
