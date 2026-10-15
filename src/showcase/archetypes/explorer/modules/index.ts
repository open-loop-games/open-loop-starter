import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createChronicleModule } from './chronicle';
import { createLodgeModule } from './lodge';
import { createWoldModule } from './wold';
import { createHuntsmanModule } from './huntsman';

export { ExplorerTuningRegistryKey, type ExplorerTunableKey } from './tuning';
export { ChronicleKey, getChronicle, type Beat, type ChronicleApi, type Tone } from './chronicle';
export { LodgeKey, getLodge, type LodgeApi, type LodgeStore } from './lodge';
export { WoldKey, getWold, type WayfinderDef, type WoldApi } from './wold';
export {
  HuntsmanKey,
  PACK_ITEMS,
  getHuntsman,
  type Action,
  type HartTrail,
  type HuntsmanApi,
  type PackItem,
} from './huntsman';
export { tileIndex, type Tile } from './wold-map';

/**
 * The explorer modules in dependency order: the registry, the record, the lodge,
 * the map, then the huntsman who walks it.
 */
export function createExplorerModules(): EngineModule[] {
  return [
    createTuningModule(),
    createChronicleModule(),
    createLodgeModule(),
    createWoldModule(),
    createHuntsmanModule(),
  ];
}
