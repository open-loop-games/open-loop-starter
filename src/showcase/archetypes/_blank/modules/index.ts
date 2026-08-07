import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createAutomationModule } from './automation';
import { createCoreModule } from './core';

export { GameTuningRegistryKey, type GameTunableKey } from './tuning';
export { AutomationKey, type AutomationApi, type GameAutomationTier } from './automation';
export { CoreKey, type CoreApi } from './core';

/**
 * The blank game's module list. `bootEngine` installs the shared base
 * (settings, ui-prefs) alongside these, so the engine boots with
 * working saves and settings.
 *
 * These three are the DELETE-OR-RESHAPE example economy (see `./core.ts`): the
 * tuning registry (the `tunable()` perturbation path), the automation ladder
 * (the `AutomationTiers` gate every player-facing policy runs behind), and a
 * single accumulator mechanic. They exist so a clean fork inherits a working,
 * green balance scaffold rather than empty stubs — replace them with your
 * modules as the game grows.
 */
export function createGameModules(): EngineModule[] {
  return [createTuningModule(), createAutomationModule(), createCoreModule()];
}
