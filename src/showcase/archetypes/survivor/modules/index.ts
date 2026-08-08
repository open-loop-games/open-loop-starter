import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createArenaModule, type ArenaModuleOptions } from './arena';
import { createRunModule } from './run';
import { createDraftModule } from './draft';
import { createMetaModule } from './meta';

export { SurvivorTuningRegistryKey, type SurvivorTunableKey } from './tuning';
export { ArenaKey, createArenaModule, type ArenaApi, type RunOutcome } from './arena';
export { RunKey, type RunApi, type BindingCause } from './run';
export { DraftKey, OFFER_COUNT, type DraftApi, type DraftOffer } from './draft';
export { MetaKey, type MetaApi } from './meta';

/**
 * The archetype's module list. `bootEngine` installs the shared base (settings,
 * ui-prefs) alongside these.
 *
 * Order is irrelevant — the engine topo-sorts on `dependencies` — but the tuning
 * foundation is listed first because everything reads through it.
 */
export function createSurvivorModules(options: ArenaModuleOptions = {}): EngineModule[] {
  return [
    createTuningModule(),
    createMetaModule(),
    createArenaModule(options),
    createRunModule(),
    createDraftModule({ seed: options.seed }),
  ];
}
