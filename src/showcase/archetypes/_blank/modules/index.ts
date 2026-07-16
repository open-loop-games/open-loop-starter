import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createCoreModule } from './core';

/**
 * The blank game's module list. `bootEngine` installs the shared base
 * (settings, ui-prefs) alongside these, so the engine boots with
 * working saves and settings.
 *
 * These two are the DELETE-OR-RESHAPE example economy (see `./core.ts`): the
 * tuning registry (the `tunable()` perturbation path) and a single accumulator
 * mechanic. They exist so a clean fork inherits a working, green three-lane
 * balance scaffold rather than empty stubs — replace them with your modules as
 * the game grows.
 */
export function createGameModules(): EngineModule[] {
  return [createTuningModule(), createCoreModule()];
}
