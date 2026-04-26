import type { TugData } from './types';
import { ABILITIES } from './abilities';
import { TUG_BALANCE, TUG_THEME } from './balance';
import { COUNTER_MATRIX } from './counter-matrix';
import { TUG_FORTRESS } from './fortress';
import { INCOME_UPGRADES } from './income';
import { UNITS } from './units';

export * from './types';
export { ABILITIES } from './abilities';
export { TUG_BALANCE, TUG_THEME } from './balance';
export { COUNTER_MATRIX } from './counter-matrix';
export { TUG_FORTRESS } from './fortress';
export { INCOME_UPGRADES } from './income';
export { UNITS } from './units';
export { applyTugOverrides, type TugOverrides } from './overrides';

export const DEFAULT_TUG_DATA: TugData = {
  units: UNITS,
  incomeUpgrades: INCOME_UPGRADES,
  abilities: ABILITIES,
  counterMatrix: COUNTER_MATRIX,
  fortress: TUG_FORTRESS,
  balance: TUG_BALANCE,
  theme: TUG_THEME,
};
