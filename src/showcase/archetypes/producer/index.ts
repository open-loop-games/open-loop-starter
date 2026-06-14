export {
  createApp,
  createProducerEngine,
  type ProducerBootResult,
  type ProducerEngineOptions,
} from './boot';
export { manifest } from './manifest';
export {
  DEFAULT_PRODUCER_DATA,
  PRODUCERS,
  UPGRADES,
  ACHIEVEMENTS,
  CLICK_PRODUCER_ID,
  CONTINUOUS_PRODUCER_IDS,
  TIER1_UPGRADE_IDS,
} from './data';
export type { ProducerDef, UpgradeDef, AchievementDef, ProducerData } from './data/types';
export { applyProducerOverrides, type ProducerOverrides } from './data/overrides';
export {
  ProducerTuningRegistryKey,
  createProducerModules,
  getBuildings,
  getClickCount,
  getPrimaryResource,
  getUpgrades,
  getAchievements,
  MILESTONE_THRESHOLDS,
  AutobuyerMasterToggleKey,
  AutobuyerRegistryKey,
  type AutobuyerSpec,
  type ProducerInstanceState,
} from './modules';
