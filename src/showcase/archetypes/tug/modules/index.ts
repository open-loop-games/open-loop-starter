import type { EngineModule } from '@open-loop/engine';
import { createBattleModule } from './battle';
import { createCausewayModule } from './causeway';
import { createChronicleModule } from './chronicle';
import { createKeepModule } from './keep';
import { createRivalModule } from './rival';
import { createTuningModule } from './tuning';

export { TugTuningRegistryKey, type TugTunableKey } from './tuning';
export * from './sides';
export * from './chronicle';
export * from './causeway';
export * from './keep';
export * from './rival';
export * from './battle';

/**
 * The tug modules in dependency order: the registry; the Chronicle, which outlasts every
 * battle and builds both keeps' chains; the causeway; the two keeps; the lord across the
 * causeway; the battle that drives them all.
 */
export function createTugModules(): EngineModule[] {
  return [
    createTuningModule(),
    createChronicleModule(),
    createCausewayModule(),
    createKeepModule('player'),
    createKeepModule('rival'),
    createRivalModule(),
    createBattleModule(),
  ];
}
