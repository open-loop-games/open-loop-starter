import type { EngineModule } from '@open-loop/engine';
import type { ProducerData } from '../data/types';
import { createTuningModule } from './tuning';
import { createSwarmModule } from './swarm';
import { createRefinementsModule } from './refinements';
import { createRevisionsModule } from './revisions';
import { createAutomationModule, type AutomationModuleOptions } from './automation';
import { createOfflineModule } from './offline';

export { ProducerTuningRegistryKey, type ProducerTunableKey } from './tuning';
export {
  MassLifetimeKey,
  buildProducerGameState,
  getClasses,
  getHeadlineRate,
  getLaunchCount,
  getLauncher,
  getMass,
  launch,
} from './swarm';
export { getProducerGameState, getRefinements } from './refinements';
export { getRevisions } from './revisions';
export {
  DispatchKey,
  buildDispatchPolicies,
  type AutomationModuleOptions,
  type DispatchApi,
  type DispatchPolicyName,
  type ProducerAutomationTier,
} from './automation';
export { OfflineKey, type OfflineApi, type OfflineReturn } from './offline';

/**
 * Compose the producer modules in dependency order. Modules close over `data`
 * at construction; balance constants land at `tunable()` reader sites in their
 * owning modules (see `ProducerTuningRegistryKey`).
 *
 * The order is the chain order: swarm creates every rate chain, then
 * refinements, revisions and generation bind onto them. Automation comes last
 * because it needs the registered classes to build its policies. Offline sits
 * after everything it replays, so a catch-up runs the whole stack.
 */
export function createProducerModules(
  data: ProducerData,
  options: { automation?: AutomationModuleOptions } = {},
): EngineModule[] {
  return [
    createTuningModule(),
    createSwarmModule(data),
    createRefinementsModule(data),
    createRevisionsModule(data),
    createAutomationModule(options.automation),
    createOfflineModule(),
  ];
}
