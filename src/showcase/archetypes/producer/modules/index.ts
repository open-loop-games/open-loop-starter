import type { EngineModule } from '@open-loop/engine';
import type { ProducerData } from '../data/types';
import { createProducersModule } from './producers';
import { createMilestonesModule } from './milestones';
import { createUpgradesModule } from './upgrades';
import { createAchievementsModule } from './achievements';
import { createAutobuyerRegistryModule } from './autobuyers';
import { createProducerAutobuyersModule } from './autobuyers/producers';

export { buildProducerPolicy } from './autobuyers/producers';

export {
  ProducerTuningRegistryKey,
  getBuildings,
  getClickCount,
  getPrimaryResource,
  type ProducerInstanceState,
} from './producers';
export { getUpgrades } from './upgrades';
export { getAchievements } from './achievements';
export { MILESTONE_THRESHOLDS } from './milestones';
export { AutobuyerMasterToggleKey, AutobuyerRegistryKey, type AutobuyerSpec } from './autobuyers';

/**
 * Compose the producer modules in dependency order. Modules close over
 * `data` at construction — overrides applied upstream in
 * `boot.ts::createProducerEngine` flow through unchanged.
 */
export function createProducerModules(data: ProducerData): EngineModule[] {
  return [
    createProducersModule(data),
    createMilestonesModule(data),
    createUpgradesModule(data),
    createAchievementsModule(data),
    createAutobuyerRegistryModule(),
    createProducerAutobuyersModule(),
  ];
}
