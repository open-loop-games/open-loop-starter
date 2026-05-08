import type { EngineModule } from 'open-loop-engine';
import { coinModule } from './coin';
import { prestigeModule } from './prestige';
import { transcendModule } from './transcend';
import { challengesModule } from './challenges';
import { runesModule } from './runes';
import { autobuyersModule } from './autobuyers';

export {
  coinModule,
  getCoinResource,
  getCoinProducers,
  getAccelerator,
  getMultiplier,
  getCoinUpgrades,
} from './coin';

export {
  prestigeModule,
  getPrestigePoints,
  getPrestigeShards,
  getCoinsThisPrestige,
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
  boostAccelerator,
} from './transcend';

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
 * runes declares `dependencies: ['scaler-coin', 'scaler-prestige']` (doesn't
 * gate on transcend, but registration order is coin → prestige → transcend
 * → challenges → runes → autobuyers); autobuyers declares
 * `dependencies: ['scaler-coin', 'scaler-prestige']` and reads the runes /
 * transcend / challenges module accessors at runtime.
 */
export function createScalerModules(): EngineModule[] {
  return [
    coinModule,
    prestigeModule,
    transcendModule,
    challengesModule,
    runesModule,
    autobuyersModule,
  ];
}
