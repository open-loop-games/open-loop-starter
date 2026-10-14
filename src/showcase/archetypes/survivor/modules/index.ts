import type { EngineModule } from '@open-loop/engine';
import { createMetaModule } from './meta';
import { createTakeModule } from './take';
import { createTuningModule } from './tuning';

/**
 * The floor's tick rate. The arena step is not tick-robust (a different dt plays a different
 * take), so the live engine runs fixed ticks at this rate, and the probes and suites tick at
 * it too.
 */
export const INTERVAL_RATE = 30;

export { SurvivorTuningRegistryKey, type SurvivorTunableKey } from './tuning';
export * from './meta';
export * from './take';

/**
 * The survivor modules in dependency order: the registry; the meta module, which outlasts
 * every take and builds the chains; the take that steps the floor.
 */
export function createSurvivorModules(): EngineModule[] {
  return [createTuningModule(), createMetaModule(), createTakeModule()];
}
