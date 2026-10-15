import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createCoreModule } from './core';
import { createRunModule } from './run';
import { createLegacyModule } from './legacy';
import { createContinuityModule } from './continuity';
import { createCanonModule } from './canon';
import { createPrestigeModule } from './prestige';
import { createLegendsModule } from './legends';
import { createAutomationModule } from './automation';
export {
  createReferencePlayer,
  type ElseworldEntry,
  type ReferencePlayer,
  type ReferencePlayerApis,
} from './reference-player';

export { ScalerTuningRegistryKey, type ScalerTunableKey } from './tuning';
export { CoreKey, getCore, type CoreApi, type ScannerKind } from './core';
export { RunKey, getRun, HEROES, JUSTICE, type RunApi } from './run';
export { LegacyKey, getLegacy, LEGACY_SHOP, type LegacyApi } from './legacy';
export { ContinuityKey, getContinuity, CONTINUITY_SHOP, type ContinuityApi } from './continuity';
export { CanonKey, getCanon, CANON_SHOP, type CanonApi } from './canon';
export { createChain, type ChainOptions } from './chain';
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
  shouldRewrite,
  spendShop,
  type AutomationApi,
  type RebootParams,
  type RebootState,
  type RewriteState,
  type ScalerAutomationTier,
} from './automation';

/**
 * The scaler modules in dependency order, one per reset depth where a layer
 * wipes: the registry, the modifier chains and clocks no reset reaches, the run
 * a Reboot wipes, Legacy that a Rewrite wipes, Continuity that an Age wipes,
 * Canon that nothing wipes, the prestige layers and their Elseworlds, the
 * Legends, and the automation ladder.
 */
export function createScalerModules(): EngineModule[] {
  return [
    createTuningModule(),
    createCoreModule(),
    createRunModule(),
    createLegacyModule(),
    createContinuityModule(),
    createCanonModule(),
    createPrestigeModule(),
    createLegendsModule(),
    createAutomationModule(),
  ];
}
