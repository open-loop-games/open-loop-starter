import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createTelegraphModule } from './telegraph';
import { createEmpireModule } from './empire';
import { createCalendarModule } from './calendar';
import { createWorksModule } from './works';
import { createMinistryModule } from './ministry';
import { createAutomationModule } from './automation';
import { createExpositionModule } from './exposition';

export { InterlockerTuningRegistryKey, type InterlockerTunableKey } from './tuning';
export { TelegraphKey, getTelegraph, type Notice, type TelegraphApi } from './telegraph';
export { EmpireKey, getEmpire, type EmpireApi } from './empire';
export { CalendarKey, getCalendar, type CalendarApi } from './calendar';
export {
  AutomationKey,
  getAutomation,
  empireOf,
  type AutomationApi,
  type InterlockerAutomationTier,
} from './automation';
export { MinistryKey, getMinistry, type MinistryApi, type Order } from './ministry';
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
    createCalendarModule(),
    createWorksModule(),
    createMinistryModule(),
    createAutomationModule(),
    createExpositionModule(),
  ];
}
