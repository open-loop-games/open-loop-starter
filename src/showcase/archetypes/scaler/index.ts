export { createApp, createScalerEngine } from './boot';
export type { ScalerBootResult, ScalerEngineOptions } from './boot';
export { manifest } from './manifest';
export {
  DEFAULT_SCALER_DATA,
  COIN_PRODUCERS,
  DIAMOND_PRODUCERS,
  ACCELERATOR_DEF,
  MULTIPLIER_DEF,
  COIN_UPGRADES,
  PRESTIGE_UPGRADES,
  CRYSTAL_UPGRADES,
  type ScalerData,
  type ScalerGameState,
  type ProducerDef,
  type CumulativeUpgradeDef,
  type CrystalUpgradeDef,
  type UpgradeDef,
  type UpgradeGrant,
  type UpgradeEffectScope,
  type Tier,
} from './data';
export {
  ScalerTuningRegistryKey,
  type ScalerTunableKey,
  type ScalerTunables,
} from './modules/tuning';
export {
  CANONICAL_ACCELERATOR_POWER,
  CANONICAL_MULTIPLIER_POWER,
  CANONICAL_ACCELERATOR_BOOST_FREE_ACCEL_PER_BUY,
} from './modules/canonical';
export {
  coinModule,
  prestigeModule,
  createScalerModules,
  getCoinResource,
  getCoinProducers,
  getAccelerator,
  getMultiplier,
  getCoinUpgrades,
  getPrestigePoints,
  getPrestigeShards,
  getCoinsThisPrestige,
  getDiamondProducers,
  getCrystalUpgrades,
  getPrestigeUpgrades,
  getPrestigeReset,
  getPrestigeConversion,
  getPrestigePointGain,
} from './modules';
