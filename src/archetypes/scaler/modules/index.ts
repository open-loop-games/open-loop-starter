import type { EngineModule } from 'open-loop-engine';
import { coinModule } from './coin';

export {
  coinModule,
  getCoinResource,
  getCoinProducers,
  getAccelerator,
  getMultiplier,
  getCoinUpgrades,
  getCoinReset,
} from './coin';

/**
 * Compose the scaler modules in dependency order. At leaf 1 only the coin
 * tier exists; later leaves register prestige / transcend / runes / challenges
 * / achievements / autobuyers alongside.
 */
export function createScalerModules(): EngineModule[] {
  return [coinModule];
}
