import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createGardenModule } from './garden';
import { createPlotModule } from './plot';

export { DefenderTuningRegistryKey, type DefenderTunableKey } from './tuning';
export { GardenKey, getGarden, type GardenApi } from './garden';
export { PlotKey, getPlot, type PlotApi, type PlotResult } from './plot';
export {
  createPlotRun,
  evaluateCompanions,
  type Cell,
  type CompanionView,
  type Pest,
  type Plant,
  type PlotRun,
  type RunEvent,
  type RunPhase,
  type Shot,
  type WaveLog,
} from './run';

/** The defender modules in dependency order: the registry, the garden, then the plot run. */
export function createDefenderModules(): EngineModule[] {
  return [createTuningModule(), createGardenModule(), createPlotModule()];
}
