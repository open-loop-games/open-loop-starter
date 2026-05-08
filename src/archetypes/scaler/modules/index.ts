import type { EngineModule } from 'open-loop-engine';
import { coinModule } from './coin';
import { prestigeModule } from './prestige';

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

/**
 * Compose the scaler modules in dependency order. Coin first; prestige
 * declares `dependencies: ['scaler-coin']` so the engine resolves the
 * install order regardless of array order, but listing in install order
 * here keeps the read clean.
 */
export function createScalerModules(): EngineModule[] {
  return [coinModule, prestigeModule];
}
