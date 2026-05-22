import type { EngineModule } from '@open-loop/engine';
import type { InterlockerData } from '../data/types';
import { createTuningModule } from './tuning';
import { createResourcesModule } from './resources';
import { createBuildingsModule } from './buildings';
import { createVillageModule } from './village';
import { createWorkshopModule } from './workshop';
import { createSciencesModule } from './sciences';

export {
  InterlockerDataKey,
  InterlockerTuningRegistryKey,
  type InterlockerTunableKey,
} from './tuning';
export { ResourcesKey, getResources, type ResourcesApi } from './resources';
export { BuildingsKey, getBuildings, type BuildingsApi } from './buildings';
export { VillageKey, getVillage, type VillageApi } from './village';
export { WorkshopKey, getWorkshop, type WorkshopApi } from './workshop';
export { SciencesKey, getSciences, type SciencesApi } from './sciences';

/**
 * Compose the Interlocker modules in dependency order. The engine topo-sorts
 * on `dependencies`; listing in order keeps the source readable.
 *
 *  1. `interlocker/tuning` — registry + data publish (no dependencies).
 *  2. `interlocker/resources` — bag + per-type Resource + max/rate chains
 *     (deps: tuning).
 *  3. `interlocker/sciences` — limit:1 purchasable + completion-flipped
 *     visibility cascade (deps: tuning, resources).
 *  4. `interlocker/buildings` — purchasable category + smelter onTick
 *     (deps: tuning, resources, sciences).
 *  5. `interlocker/village` — kittens + jobs + catnip consumption + starvation
 *     (deps: tuning, resources, sciences).
 *  6. `interlocker/workshop` — crafts via createCategoryBase + createConversion
 *     (deps: tuning, resources, buildings, sciences).
 *
 * Phase 1 ships all six as STUBs publishing only the injection keys and API
 * contracts. `tuning` is the only fully-implemented module — its body
 * (registry creation + data publish) is the foundation Phase 2 fan-out
 * branches consume.
 *
 * Phase 2 fan-out fills modules 2 (resources), 4 (buildings), and 5 (village)
 * in three parallel worktree-isolated branches. Phase 3 then fills 3
 * (sciences) and 6 (workshop) on main; module 6 is the final wiring step
 * because crafts consume bag + max-chains (resources) AND require the
 * workshop building to be owned (buildings).
 */
export function createInterlockerModules(data: InterlockerData): EngineModule[] {
  return [
    createTuningModule(data),
    createResourcesModule(data),
    createSciencesModule(data),
    createBuildingsModule(data),
    createVillageModule(data),
    createWorkshopModule(data),
  ];
}
