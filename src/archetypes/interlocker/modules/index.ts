import type { EngineModule } from '@open-loop/engine';
import type { InterlockerData } from '../data/types';
import { createTuningModule } from './tuning';
import { createResourcesModule } from './resources';
import { createBuildingsModule } from './buildings';
import { createVillageModule } from './village';
import { createWorkshopModule } from './workshop';
import { createSciencesModule } from './sciences';
import { createCalendarModule } from './calendar';

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
export { CalendarKey, getCalendar, type CalendarApi, type SeasonChangedEvent } from './calendar';

/**
 * Compose the Interlocker modules in dependency order. The engine topo-sorts
 * on `dependencies`; listing in order keeps the source readable.
 *
 *  1. `interlocker/tuning` — registry + data publish (no dependencies).
 *  2. `interlocker/resources` — bag + per-type Resource + max/rate chains
 *     (deps: tuning).
 *  3. `interlocker/sciences` — limit:1 purchasable + completion-flipped
 *     visibility cascade (deps: tuning, resources).
 *  4. `interlocker/village` — kittens + jobs + catnip consumption + starvation
 *     + consumptionRateChain owner (deps: tuning, resources, sciences).
 *  5. `interlocker/workshop` — crafts via createCategoryBase + createConversion
 *     + craftOutputChain owner (deps: tuning, resources, sciences;
 *     buildingCount via lazy `() => ctx.inject(BuildingsKey)`).
 *  6. `interlocker/buildings` — purchasable category + smelter onTick + grant
 *     resolver consuming village.consumptionRateChain + workshop.craftOutputChain
 *     (deps: tuning, resources, sciences, village, workshop).
 *
 * Phase 1 ships all six as STUBs publishing only the injection keys and API
 * contracts. Phase 2 fan-out fills resources, buildings, village. Phase 3
 * (this commit) fills sciences and workshop, extends village with the
 * consumption chain, and adds the resolver wiring to buildings.
 */
export function createInterlockerModules(data: InterlockerData): EngineModule[] {
  return [
    createTuningModule(data),
    createResourcesModule(data),
    createCalendarModule(data),
    createSciencesModule(data),
    createVillageModule(data),
    createWorkshopModule(data),
    createBuildingsModule(data),
  ];
}
