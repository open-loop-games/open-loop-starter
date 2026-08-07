import type { EngineModule } from '@open-loop/engine';
import type { AmbientData } from '../data/types';
import { createTuningModule } from './tuning';
import { createAutoProducersModule } from './auto-producers';
import { createUnlocksModule } from './unlocks';
import { createSceneModule } from './scene';
import { createSessionClockModule } from './session-clock';
import { createAchievementsModule } from './achievements';
import { createPrestigeModule } from './prestige';
import { createAutobuyerRegistryModule } from './autobuyers';
import { createAutoProducerAutobuyersModule } from './autobuyers/auto-producers';

export { AmbientTuningRegistryKey, type AmbientTunableKey, type AmbientTunables } from './tuning';
export {
  PrimaryLifetimeKey,
  getAutoProducers,
  getPrimaryResource,
  getTimeSystem,
} from './auto-producers';
export { getUnlocks } from './unlocks';
export { SceneKey, type SceneState } from './scene';
export { SessionClockKey, type SessionClock } from './session-clock';
export { getAchievements, DEFAULT_ACHIEVEMENT_MULTIPLIER } from './achievements';
export { PrestigeKey } from './prestige';
export { AutobuyerMasterToggleKey, AutobuyerRegistryKey, type AutobuyerSpec } from './autobuyers';

/**
 * Prestige code-path gate. Structural cardinality, not a runtime tunable —
 * forks wiring prestige flip this to `true` and author currency / multiplier
 * accrual at the `PrestigeKey` injection site. Default ships zero prestige
 * code paths active (cozy contract).
 */
const PRESTIGE_ENABLED = false;

/**
 * Compose the ambient modules in dependency order. Modules close over `data`
 * at construction; balance constants land at `tunable()` reader sites in
 * their owning modules (see `AmbientTuningRegistryKey`).
 */
export function createAmbientModules(data: AmbientData): EngineModule[] {
  const modules: EngineModule[] = [
    createTuningModule(),
    createAutoProducersModule(data),
    createUnlocksModule(data),
    createSceneModule(data),
    createSessionClockModule(),
    createAchievementsModule(data),
    createAutobuyerRegistryModule(),
    createAutoProducerAutobuyersModule(),
  ];
  if (PRESTIGE_ENABLED) {
    modules.push(createPrestigeModule());
  }
  return modules;
}
