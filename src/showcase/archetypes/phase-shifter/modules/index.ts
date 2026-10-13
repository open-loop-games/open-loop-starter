import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createCaseModule } from './case';
import { createBoxModule } from './box';
import { createBoardModule } from './board';
import { createNightModule } from './night';
import { createAutomationModule } from './automation';

export { PhaseShifterTuningRegistryKey, type PhaseShifterTunableKey } from './tuning';
export { CaseKey, getCase, type CaseApi } from './case';
export { type Lifecycle } from './lifecycle';
export { BoxKey, getBox, type BoxApi } from './box';
export { BoardKey, getBoard, type BoardApi } from './board';
export { NightKey, getNight, type NightApi } from './night';
export {
  AutomationKey,
  getAutomation,
  type AutomationApi,
  type PhaseShifterAutomationTier,
} from './automation';

/**
 * The phase-shifter modules in dependency order: the registry, the case file
 * and its doors, then one module per phase, then the clerks' automation.
 */
export function createPhaseShifterModules(): EngineModule[] {
  return [
    createTuningModule(),
    createCaseModule(),
    createBoxModule(),
    createBoardModule(),
    createNightModule(),
    createAutomationModule(),
  ];
}
