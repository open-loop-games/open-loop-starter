import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createMetaModule } from './meta';
import { createNightModule } from './night';
import { createAutomationModule } from './automation';

export { LooperTuningRegistryKey, type LooperTunableKey } from './tuning';
export {
  MetaKey,
  addToPlan,
  bumpTimes,
  getMeta,
  moveRow,
  removeRow,
  type MetaApi,
  type PlanRow,
} from './meta';
export {
  NightKey,
  getNight,
  type ActionState,
  type NightApi,
  type NightSummary,
  type RowPayload,
} from './night';
export {
  AutomationKey,
  ROUTINE_DWELL,
  getAutomation,
  shouldBeginNight,
  shouldTurnIn,
  type AutomationApi,
  type DisciplineState,
  type LooperAutomationTier,
  type RoutineState,
} from './automation';

/**
 * The looper modules in dependency order: the registry, then what survives a
 * night, then the night it resets, then the automation that drives both.
 */
export function createLooperModules(): EngineModule[] {
  return [createTuningModule(), createMetaModule(), createNightModule(), createAutomationModule()];
}
