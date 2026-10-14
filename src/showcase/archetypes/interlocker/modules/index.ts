import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createTelegraphModule } from './telegraph';
import { createEmpireModule } from './empire';
import { createWorksModule } from './works';
import { createExpositionModule } from './exposition';

export { InterlockerTuningRegistryKey, type InterlockerTunableKey } from './tuning';
export { TelegraphKey, getTelegraph, type Notice, type TelegraphApi, type Wire } from './telegraph';
export { EmpireKey, getEmpire, type EmpireApi } from './empire';
export {
  WORKS_CONTEXT,
  WorksKey,
  getWorks,
  type Limit,
  type RoleStatus,
  type WorksApi,
} from './works';
export { ExpositionKey, getExposition, type ExpositionApi } from './exposition';

/**
 * The interlocker modules in dependency order: the registry, the wire, what survives
 * an Exposition, the works it clears, then the Exposition itself.
 */
export function createInterlockerModules(): EngineModule[] {
  return [
    createTuningModule(),
    createTelegraphModule(),
    createEmpireModule(),
    createWorksModule(),
    createExpositionModule(),
  ];
}
