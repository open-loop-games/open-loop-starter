import {
  createGameStateAccessor,
  type AccessorServices,
  type EngineModule,
  type GameStateAccessorMutator,
} from '@open-loop/engine';
import { createFlags } from './flags';
import { createTuningModule } from './tuning';
import { createAutomationModule } from './automation';
import { createCoreModule } from './core';

export { GameTuningRegistryKey, type GameTunableKey } from './tuning';
export {
  AutomationKey,
  getAutomation,
  type AutomationApi,
  type GameAutomationTier,
} from './automation';
export { CoreKey, getCore, type CoreApi } from './core';
export { createFlags, type GameFlags } from './flags';

/** The blank game's engine pieces: its module list and the accessor that serves its flags. */
export interface Game {
  modules: EngineModule[];
  /** Pass as `bootEngine({ accessor })`. The engine calls it once, at `start()`. */
  accessor: (services: AccessorServices) => GameStateAccessorMutator;
}

/**
 * Build one engine's worth of the blank game. `bootEngine` installs the shared
 * base (settings, ui-prefs) alongside the modules, so the engine boots with
 * working saves and settings. Call it once per engine: the flags module and the
 * accessor that reads it are made together.
 *
 * The modules are the DELETE-OR-RESHAPE example economy (see `./core.ts`):
 * - the saved flags, which the accessor serves to every `flag` Gate and effect;
 * - the tuning registry (the `tunable()` perturbation path);
 * - the automation ladder (`AutomationTiers`), which blocks every player-facing
 *   policy until its automation tier unlocks;
 * - a single accumulator mechanic.
 *
 * They exist so a clean fork inherits a working, green balance scaffold rather
 * than empty stubs. Replace them with your modules as the game grows. A game
 * with state paths or rates adds `getStateAt`, `setStateAt` or `getRate` to
 * the accessor options beside the flags.
 */
export function createGame(): Game {
  const flags = createFlags();
  return {
    modules: [flags.module, createTuningModule(), createAutomationModule(), createCoreModule()],
    accessor: (services) =>
      createGameStateAccessor(services, { getFlag: flags.getFlag, setFlag: flags.setFlag }),
  };
}
