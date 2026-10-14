import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createCoreModule } from './core';
import { createRunModule } from './run';
import { createLegacyModule } from './legacy';
import { createContinuityModule } from './continuity';
import { createPrestigeModule } from './prestige';
import { createLegendsModule } from './legends';
import { createAutomationModule } from './automation';

export { ScalerTuningRegistryKey, type ScalerTunableKey } from './tuning';
export { CoreKey, getCore, type CoreApi, type ScannerKind, type ScannerLine } from './core';
export { RunKey, getRun, HEROES, JUSTICE, type RunApi } from './run';
export { LegacyKey, getLegacy, LEGACY_SHOP, type LegacyApi } from './legacy';
export { ContinuityKey, getContinuity, CONTINUITY_SHOP, type ContinuityApi } from './continuity';
export {
  PrestigeKey,
  getPrestige,
  ELSEWORLDS_CATEGORY,
  type ElseworldChallengeDef,
  type PrestigeApi,
} from './prestige';
export { LegendsKey, getLegends, type LegendsApi } from './legends';
export {
  AutomationKey,
  getAutomation,
  pickHero,
  shouldReboot,
  type AutomationApi,
  type RebootParams,
  type RebootState,
  type ScalerAutomationTier,
} from './automation';

/**
 * The scaler modules in dependency order, one per reset depth where a layer
 * wipes: the registry, the chains and clocks no reset reaches, the run a Reboot
 * wipes, Legacy that a Rewrite wipes, Continuity that nothing wipes, the
 * prestige layers and their Elseworlds, the Legends, and the automation ladder.
 */
export function createScalerModules(): EngineModule[] {
  return [
    createTuningModule(),
    createCoreModule(),
    createRunModule(),
    createLegacyModule(),
    createContinuityModule(),
    createPrestigeModule(),
    createLegendsModule(),
    createAutomationModule(),
  ];
}
