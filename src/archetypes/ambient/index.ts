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
  AMBIENT_BALANCE,
  AUTO_PRODUCERS,
  SCENE_VARIANTS,
  UNLOCKS,
} from './data';
export type {
  AchievementDef,
  AmbientBalance,
  AmbientData,
  AmbientGameState,
  AutoProducerDef,
  SceneVariantDef,
  UnlockDef,
  UnlockReveal,
} from './data/types';
export { applyAmbientOverrides, type AmbientOverrides } from './data/overrides';
export {
  AmbientTuningRegistryKey,
  PrimaryLifetimeKey,
  SceneKey,
  SessionClockKey,
  PrestigeKey,
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
