import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createFirmModule } from './firm';
import { createAutomationModule, type AutomationModuleOptions } from './automation';
import { createTipsModule } from './tips';
import { createStandingModule } from './standing';
import { createOfflineModule } from './offline';

export { ProducerTuningRegistryKey, type ProducerTunableKey } from './tuning';
export { FirmKey, getFirm, type FirmApi, type LedgerExtra, type LedgerKind } from './firm';
export {
  AutomationKey,
  acquisitionPolicy,
  getAutomation,
  type AutomationApi,
  type AutomationModuleOptions,
  type ProducerAutomationTier,
} from './automation';
export { TipsKey, TIP_EFFECTS, getTips, type TipEffect, type TipsApi } from './tips';
export { StandingKey, getStanding, type StandingApi } from './standing';
export { OfflineKey, getOffline, type OfflineApi, type OfflineReturn } from './offline';

/**
 * The producer modules in dependency order: the registry, the firm that earns,
 * the desks and their phones, tips on the wire, standing over every achievement,
 * and offline catch-up last, so a replay runs the whole stack.
 */
export function createProducerModules(
  options: { automation?: AutomationModuleOptions } = {},
): EngineModule[] {
  return [
    createTuningModule(),
    createFirmModule(),
    createAutomationModule(options.automation),
    createTipsModule(),
    createStandingModule(),
    createOfflineModule(),
  ];
}
