import type { EngineModule } from 'open-loop-engine';
import type { ProducerData } from '../data/types';
import { createProducersModule } from './producers';
import { createUpgradesModule } from './upgrades';
import { createMilestonesModule } from './milestones';
import { createAchievementsModule } from './achievements';
import { createAutobuyerRegistryModule } from './autobuyers';
import { createProducerAutobuyersModule } from './autobuyers/producers';

export {
  ProducerTuningRegistryKey,
  getBuildings,
  getClickCount,
  getPrimaryResource,
  type ProducerInstanceState,
} from './producers';
export { getUpgrades } from './upgrades';
export { getAchievements } from './achievements';
export { AutobuyerMasterToggleKey, AutobuyerRegistryKey, type AutobuyerSpec } from './autobuyers';

/**
 * Compose the producer modules in dependency order.
 * Modules close over `data` at construction — overrides applied upstream in
 * `boot.ts::createProducerEngine` flow through unchanged.
 */
export function createProducerModules(data: ProducerData): EngineModule[] {
  return [
    createProducersModule(data),
    createUpgradesModule(data),
    createMilestonesModule(data),
    createAchievementsModule(data),
    createAutobuyerRegistryModule(),
    createProducerAutobuyersModule(),
  ];
}
