import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createLogbookModule } from './logbook';
import { createWatchModule } from './watch';

export { CyclerTuningRegistryKey, type CyclerTunableKey } from './tuning';
export { LogbookKey, getLogbook, type LogbookApi, type WatchSummary } from './logbook';
export { WatchKey, getWatch, type WatchApi, type Phase, type Strike } from './watch';
export * from './rock';

/**
 * The cycler modules in dependency order: the registry; what outlasts a watch; the watch,
 * which the light going out resets.
 */
export function createCyclerModules(): EngineModule[] {
  return [createTuningModule(), createLogbookModule(), createWatchModule()];
}
