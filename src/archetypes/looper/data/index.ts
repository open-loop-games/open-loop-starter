import type { LooperData } from './types';
import { ACTIONS } from './actions';
import { LOOPER_BALANCE } from './balance';
import { SKILLS } from './skills';
import { ZONES } from './zones';

export * from './types';
export { ACTIONS } from './actions';
export { LOOPER_BALANCE } from './balance';
export { SKILLS } from './skills';
export { ZONES } from './zones';
export { applyLooperOverrides, type LooperOverrides } from './overrides';

export const DEFAULT_LOOPER_DATA: LooperData = {
  skills: SKILLS,
  zones: ZONES,
  actions: ACTIONS,
  balance: LOOPER_BALANCE,
};
