import type { AutoBattlerData } from './types';
import { UNITS } from './units';
import { SYNERGIES } from './synergies';
import { DEFAULT_SHOP, DEFAULT_INTEREST } from './shop';
import { DEFAULT_ROUNDS } from './rounds';
import { DEFAULT_PROGRESSION, DEFAULT_BALANCE } from './progression';

export * from './types';
export { UNITS, UNIT_IDS } from './units';
export { SYNERGIES } from './synergies';
export { DEFAULT_SHOP, DEFAULT_INTEREST } from './shop';
export { DEFAULT_ROUNDS } from './rounds';
export {
  GRID_MODE,
  POOL_MODE,
  COMBAT_MODE,
  COMBINE_MODE,
  ACQUISITION_MODE,
  PRESTIGE_MODE,
  DEFAULT_PROGRESSION,
  DEFAULT_BALANCE,
} from './progression';

export const DEFAULT_AUTO_BATTLER_DATA: AutoBattlerData = {
  units: UNITS,
  synergies: SYNERGIES,
  shop: DEFAULT_SHOP,
  interest: DEFAULT_INTEREST,
  rounds: DEFAULT_ROUNDS,
  progression: DEFAULT_PROGRESSION,
  balance: DEFAULT_BALANCE,
};
