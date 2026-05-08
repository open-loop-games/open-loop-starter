import type { EngineModule } from 'open-loop-engine';
import { coinModule } from './coin';
import { prestigeModule } from './prestige';
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
 * declares `dependencies: ['scaler-coin']`; runes declares
 * `dependencies: ['scaler-coin', 'scaler-prestige']`; autobuyers declares
 * `dependencies: ['scaler-coin', 'scaler-prestige']` (and reads runes-module
 * accessors at runtime — runes registers before autobuyers because the array
 * order tiebreaks identical dependency depths).
 */
export function createScalerModules(): EngineModule[] {
  return [coinModule, prestigeModule, runesModule, autobuyersModule];
}
