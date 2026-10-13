import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createFirmModule } from './firm';
import { createAutomationModule, type AutomationModuleOptions } from './automation';
import { createOfflineModule } from './offline';

export { ProducerTuningRegistryKey, type ProducerTunableKey } from './tuning';
export { FirmKey, getFirm, type FirmApi, type LedgerKind, type LedgerLine } from './firm';
export {
  AutomationKey,
  acquisitionPolicy,
  getAutomation,
  type AutomationApi,
  type AutomationModuleOptions,
  type ProducerAutomationTier,
} from './automation';
export { OfflineKey, getOffline, type OfflineApi, type OfflineReturn } from './offline';

/**
 * The producer modules in dependency order: the registry, the firm that earns,
 * the desks that spend for the player, and offline catch-up last, so a replay
 * runs the whole stack.
 */
export function createProducerModules(
  options: { automation?: AutomationModuleOptions } = {},
): EngineModule[] {
  return [
    createTuningModule(),
    createFirmModule(),
    createAutomationModule(options.automation),
    createOfflineModule(),
  ];
}
