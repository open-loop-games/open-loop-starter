import type { EngineModule } from 'open-loop-engine';
import type { ProducerData } from '../data/types';
import { createProducersModule } from './producers';
import { createUpgradesModule } from './upgrades';
import { createAchievementsModule } from './achievements';

export {
  PrimaryResourceKey,
  PrimaryLifetimeKey,
  BuildingsKey,
  ClickStateKey,
  HeadlineRateKey,
  ProducerDataKey,
  type ClickState,
} from './producers';
export { UpgradesKey } from './upgrades';
export { AchievementsKey } from './achievements';

/**
 * Compose the three producer modules in dependency order.
 * Modules close over `data` at construction — overrides applied upstream in
 * `boot.ts::createProducerEngine` flow through unchanged.
 */
export function createProducerModules(data: ProducerData): EngineModule[] {
  return [createProducersModule(data), createUpgradesModule(data), createAchievementsModule(data)];
}
