import type { ScalerData } from './types';
import { COIN_PRODUCERS, ACCELERATOR_DEF, MULTIPLIER_DEF } from './coin';
import { COIN_UPGRADES } from './upgrades';
import { SCALER_BALANCE } from './balance';

export * from './types';
export { COIN_PRODUCERS, ACCELERATOR_DEF, MULTIPLIER_DEF } from './coin';
export { COIN_UPGRADES } from './upgrades';
export { SCALER_BALANCE } from './balance';

export const DEFAULT_SCALER_DATA: ScalerData = {
  producers: { coin: COIN_PRODUCERS },
  cumulativeUpgrades: { accelerator: ACCELERATOR_DEF, multiplier: MULTIPLIER_DEF },
  upgrades: { coin: COIN_UPGRADES },
  balance: SCALER_BALANCE,
};
