import type { ScalerData } from './types';
import { COIN_PRODUCERS, ACCELERATOR_DEF, MULTIPLIER_DEF } from './coin';
import { COIN_UPGRADES, PRESTIGE_UPGRADES } from './upgrades';
import { DIAMOND_PRODUCERS, CRYSTAL_UPGRADES } from './prestige';
import { SCALER_BALANCE } from './balance';

export * from './types';
export { COIN_PRODUCERS, ACCELERATOR_DEF, MULTIPLIER_DEF } from './coin';
export { COIN_UPGRADES, PRESTIGE_UPGRADES } from './upgrades';
export { DIAMOND_PRODUCERS, CRYSTAL_UPGRADES } from './prestige';
export { SCALER_BALANCE } from './balance';
export {
  RUNE_SPEED,
  RUNE_DUPLICATION,
  RUNE_PRISM,
  RUNE_THRIFT,
  RUNE_SUPERIOR_INTELLECT,
  SCALER_RUNES,
} from './runes';

export const DEFAULT_SCALER_DATA: ScalerData = {
  producers: { coin: COIN_PRODUCERS, prestige: DIAMOND_PRODUCERS },
  cumulativeUpgrades: { accelerator: ACCELERATOR_DEF, multiplier: MULTIPLIER_DEF },
  upgrades: { coin: COIN_UPGRADES, prestige: PRESTIGE_UPGRADES },
  crystalUpgrades: CRYSTAL_UPGRADES,
  balance: SCALER_BALANCE,
};
