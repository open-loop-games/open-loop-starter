export {
  createApp,
  createScalerEngine,
  type ScalerBootResult,
  type ScalerEngineOptions,
} from './boot';
export { manifest } from './manifest';
export {
  DEFAULT_SCALER_DATA,
  ANTIMATTER,
  PRESTIGE,
  TRANSCEND,
  ACHIEVEMENTS,
  SCALER_BALANCE,
  applyScalerOverrides,
  type ScalerOverrides,
} from './data';
export type {
  ScalerData,
  ScalerBalance,
  AntimatterTierData,
  PrestigeTierData,
  TranscendTierData,
  ProducerDef,
  AntimatterUpgradeDef,
  CrystalUpgradeDef,
  TranscendUpgradeDef,
  ChallengeDef,
  AchievementDef,
} from './data/types';
export { createScalerModules, ScalerTiersKey, type ScalerTier } from './modules';
