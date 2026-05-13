import type { EngineModule } from '@open-loop/engine';
import { coinModule } from './coin';
import { prestigeModule } from './prestige';
import { transcendModule } from './transcend';
import { challengesModule } from './challenges';
import { runesModule } from './runes';
import { autobuyersModule } from './autobuyers';
import { achievementsModule } from './achievements';

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
 * Compose the scaler modules in dependency order. Coin first; prestige
 * declares `dependencies: ['scaler-coin']`; transcend declares
 * `dependencies: ['scaler-coin', 'scaler-prestige']`; challenges declares
 * `dependencies: ['scaler-coin', 'scaler-prestige', 'scaler-transcend']`;
 * runes declares `dependencies: ['scaler-coin', 'scaler-prestige']`;
 * achievements declares `dependencies: ['scaler-coin', 'scaler-prestige',
 * 'scaler-transcend']` and binds AP-curve grants on coin + prestige tier-
 * global rateChains plus per-row counter Grants on the free-X aggregator
 * chains owned by coin/transcend; autobuyers declares
 * `dependencies: ['scaler-coin', 'scaler-prestige']` and reads runes /
 * transcend / challenges / achievements accessors at runtime.
 */
export function createScalerModules(): EngineModule[] {
  return [
    coinModule,
    prestigeModule,
    transcendModule,
    challengesModule,
    runesModule,
    achievementsModule,
    autobuyersModule,
  ];
}
