import type { EngineModule } from 'open-loop-engine';
import type { AmbientData } from '../data/types';
import { createAutoProducersModule } from './auto-producers';
import { createUnlocksModule } from './unlocks';
import { createSceneModule } from './scene';
import { createCategoriesModule } from './categories';
import { createSessionClockModule } from './session-clock';
import { createAchievementsModule } from './achievements';
import { createPrestigeModule } from './prestige';

export {
  AmbientDataKey,
  AmbientTuningRegistryKey,
  AllRateChainsKey,
  AutoProducersKey,
  HeadlineRateKey,
  PrimaryLifetimeKey,
  PrimaryResourceKey,
  TimeSystemKey,
  type AmbientTunableKey,
  type AmbientTunables,
} from './auto-producers';
export { UnlocksKey } from './unlocks';
export { SceneKey, type SceneState } from './scene';
export { SessionClockKey, type SessionClock } from './session-clock';
export { AchievementsKey } from './achievements';
export { PrestigeKey } from './prestige';

/**
 * Compose the ambient modules in dependency order. Modules close over `data`
 * at construction; overrides applied upstream in `boot.ts::createAmbientEngine`
 * flow through unchanged.
 *
 * `prestige` is appended only when `data.balance.prestigeEnabled === true` —
 * the default ships with zero prestige code paths active.
 */
export function createAmbientModules(data: AmbientData): EngineModule[] {
  const modules: EngineModule[] = [
    createAutoProducersModule(data),
    createUnlocksModule(data),
    createSceneModule(data),
    createCategoriesModule(),
    createSessionClockModule(),
    createAchievementsModule(data),
  ];
  if (data.balance.prestigeEnabled) {
    modules.push(createPrestigeModule(data));
  }
  return modules;
}
