export {
  createApp,
  createAmbientEngine,
  type AmbientBootResult,
  type AmbientEngineOptions,
} from './boot';
export { manifest } from './manifest';
export {
  DEFAULT_AMBIENT_DATA,
  ACHIEVEMENTS,
  AUTO_PRODUCERS,
  SCENE_VARIANTS,
  UNLOCKS,
} from './data';
export type {
  AchievementDef,
  AmbientData,
  AmbientGameState,
  AutoProducerDef,
  SceneVariantDef,
  UnlockDef,
  UnlockReveal,
} from './data/types';
export {
  AmbientTuningRegistryKey,
  PrimaryLifetimeKey,
  SceneKey,
  SessionClockKey,
  PrestigeKey,
  DEFAULT_ACHIEVEMENT_MULTIPLIER,
  createAmbientModules,
  getAutoProducers,
  getPrimaryResource,
  getTimeSystem,
  getUnlocks,
  getAchievements,
  type AmbientTunableKey,
  type AmbientTunables,
  type SceneState,
  type SessionClock,
} from './modules';
