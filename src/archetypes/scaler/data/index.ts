import type { ScalerData } from './types';
import { COIN_PRODUCERS, ACCELERATOR_DEF, MULTIPLIER_DEF } from './coin';
import { COIN_UPGRADES, PRESTIGE_UPGRADES, TRANSCEND_UPGRADES } from './upgrades';
import { DIAMOND_PRODUCERS, CRYSTAL_UPGRADES } from './prestige';
import { MYTHOS_PRODUCERS } from './transcend';
import { SCALER_CHALLENGES } from './challenges';
import { SCALER_BALANCE } from './balance';

export * from './types';
export { COIN_PRODUCERS, ACCELERATOR_DEF, MULTIPLIER_DEF } from './coin';
export { COIN_UPGRADES, PRESTIGE_UPGRADES, TRANSCEND_UPGRADES } from './upgrades';
export { DIAMOND_PRODUCERS, CRYSTAL_UPGRADES } from './prestige';
export { MYTHOS_PRODUCERS } from './transcend';
export { SCALER_CHALLENGES } from './challenges';
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
  producers: { coin: COIN_PRODUCERS, prestige: DIAMOND_PRODUCERS, transcend: MYTHOS_PRODUCERS },
  cumulativeUpgrades: { accelerator: ACCELERATOR_DEF, multiplier: MULTIPLIER_DEF },
  upgrades: { coin: COIN_UPGRADES, prestige: PRESTIGE_UPGRADES, transcend: TRANSCEND_UPGRADES },
  crystalUpgrades: CRYSTAL_UPGRADES,
  challenges: SCALER_CHALLENGES,
  balance: SCALER_BALANCE,
};
