import type { EngineModule } from '@open-loop/engine';
import { createFlagsModule } from './flags';
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
export { createFlagsModule } from './flags';

/** The blank game's engine pieces: its module list. */
export interface Game {
  modules: EngineModule[];
}

/**
 * Build one engine's worth of the blank game. `bootEngine` installs the shared
 * base (settings, ui-prefs) alongside the modules, so the engine boots with
 * working saves and settings. Call it once per engine.
 *
 * The modules are the DELETE-OR-RESHAPE example economy (see `./core.ts`):
 * - the saved flags, which the engine's accessor serves to every `flag` Gate and effect;
 * - the tuning registry (the `tunable()` perturbation path);
 * - the automation ladder (`AutomationTiers`), which blocks every player-facing
 *   policy until its automation tier unlocks;
 * - a single accumulator mechanic.
 *
 * They exist so a clean fork inherits a working, green balance scaffold rather
 * than empty stubs. Replace them with your modules as the game grows. A game
 * with state paths passes `accessor: { getStateAt, setStateAt }` to
 * `bootEngine`; a rate no producer models is an `addRateSource`.
 */
export function createGame(): Game {
  return {
    modules: [
      createFlagsModule(),
      createTuningModule(),
      createAutomationModule(),
      createCoreModule(),
    ],
  };
}
