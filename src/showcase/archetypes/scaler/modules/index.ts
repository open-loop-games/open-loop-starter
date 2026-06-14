import type { EngineModule } from '@open-loop/engine';
import { tuningModule } from './tuning';
import { coinModule } from './coin';
import { prestigeModule } from './prestige';
import { transcendModule } from './transcend';
import { challengesModule } from './challenges';
import { runesModule } from './runes';
import { autobuyersModule } from './autobuyers';
import { achievementsModule } from './achievements';

export {
  tuningModule,
  ScalerTuningRegistryKey,
  type ScalerTunableKey,
  type ScalerTunables,
} from './tuning';

export {
  CANONICAL_ACCELERATOR_POWER,
  CANONICAL_MULTIPLIER_POWER,
  CANONICAL_ACCELERATOR_BOOST_FREE_ACCEL_PER_BUY,
} from './canonical';

export {
  coinModule,
  getCoinResource,
  getCoinProducers,
  getAccelerator,
  getMultiplier,
  getCoinUpgrades,
  getCoinFreeAcceleratorChain,
  getCoinFreeMultiplierChain,
  getCoinAcceleratorPowerBonusChain,
} from './coin';

export {
  prestigeModule,
  getPrestigePoints,
  getPrestigeShards,
  getCoinsThisPrestige,
  getPrestigeCount,
  getDiamondProducers,
  getCrystalUpgrades,
  getPrestigeUpgrades,
  getPrestigeReset,
  getPrestigeConversion,
  getPrestigePointGain,
} from './prestige';

export {
  transcendModule,
  getTranscendPoints,
  getTranscendShards,
  getCoinsThisTranscension,
  getTranscendCount,
  getMythosProducers,
  getTranscendUpgrades,
  getTranscendReset,
  getTranscendConversion,
  getTranscendPointGain,
  getAcceleratorBoostBought,
  getAcceleratorBoostCost,
  getTranscendFreeAccelBoostChain,
  boostAccelerator,
} from './transcend';

export { achievementsModule, getAchievementsCategory, getAchievementPoints } from './achievements';

export {
  challengesModule,
  getChallengesCategory,
  eccTranscend,
  challengeRequirement,
} from './challenges';

export {
  runesModule,
  getOfferings,
  getRuneEXP,
  getRuneLevel,
  getRuneEffects,
  getRuneDefs,
  sacrificeRune,
  computeEXPToLevel,
} from './runes';

export {
  autobuyersModule,
  getAutoEnabled,
  getAutobuyerToggles,
  type AutobuyerToggles,
} from './autobuyers';

/**
 * Compose the scaler modules in dependency order. Tuning first
 * (`scaler/tuning`, no dependencies) provides `ScalerTuningRegistryKey` for
 * the declared-invention `tunable()` reader sites in transcend + runes.
 * Coin runs next (no dependencies); prestige declares
 * `dependencies: ['scaler-coin']`; transcend declares
 * `dependencies: ['scaler/tuning', 'scaler-coin', 'scaler-prestige']`;
 * challenges declares `dependencies: ['scaler-coin', 'scaler-prestige',
 * 'scaler-transcend']`; runes declares `dependencies: ['scaler/tuning',
 * 'scaler-coin', 'scaler-prestige']`; achievements declares
 * `dependencies: ['scaler-coin', 'scaler-prestige', 'scaler-transcend']`
 * and binds AP-curve grants on coin + prestige tier-global rateChains plus
 * per-row counter Grants on the free-X aggregator chains owned by
 * coin/transcend; autobuyers declares `dependencies: ['scaler-coin',
 * 'scaler-prestige']` and reads runes / transcend / challenges /
 * achievements accessors at runtime.
 */
export function createScalerModules(): EngineModule[] {
  return [
    tuningModule,
    coinModule,
    prestigeModule,
    transcendModule,
    challengesModule,
    runesModule,
    achievementsModule,
    autobuyersModule,
  ];
}
