import type { ScalerData } from './types';
import { ANTIMATTER } from './antimatter';
import { PRESTIGE } from './prestige';
import { TRANSCEND } from './transcend';
import { ACHIEVEMENTS } from './achievements';
import { SCALER_BALANCE } from './balance';

export * from './types';
export { ANTIMATTER } from './antimatter';
export { PRESTIGE } from './prestige';
export { TRANSCEND } from './transcend';
export { ACHIEVEMENTS } from './achievements';
export { SCALER_BALANCE } from './balance';
export { applyScalerOverrides, type ScalerOverrides } from './overrides';

export const DEFAULT_SCALER_DATA: ScalerData = {
  antimatter: ANTIMATTER,
  prestige: PRESTIGE,
  transcend: TRANSCEND,
  achievements: ACHIEVEMENTS,
  balance: SCALER_BALANCE,
};
