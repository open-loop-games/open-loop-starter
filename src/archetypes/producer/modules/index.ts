import type { EngineModule } from 'open-loop-engine';
import type { ProducerData } from '../data/types';
import { createProducersModule } from './producers';
import { createUpgradesModule } from './upgrades';
import { createMilestonesModule } from './milestones';
import { createAchievementsModule } from './achievements';
import { createArcModule } from './arc';
import { createCategoriesModule } from './categories';

export {
  PrimaryResourceKey,
  PrimaryLifetimeKey,
  BuildingsKey,
  ClickStateKey,
  HeadlineRateKey,
  AllRateChainsKey,
  ProducerDataKey,
  type ClickState,
} from './producers';
export { UpgradesKey } from './upgrades';
export { MilestonesKey, type MilestoneInfo, type MilestonesState } from './milestones';
export { AchievementsKey } from './achievements';
export { ArcKey, type ArcState } from './arc';

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
    createArcModule(data),
    createCategoriesModule(),
  ];
}
