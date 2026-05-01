import type { LooperData } from './types';
import { ACTIONS } from './actions';
import { LOOPER_BALANCE } from './balance';
import { STATS } from './stats';
import { PROGRESS_VARS } from './progress-vars';
import { REGULAR_VARS } from './regular-vars';
import { ZONES } from './zones';

export * from './types';
export { ACTIONS } from './actions';
export { LOOPER_BALANCE } from './balance';
export { STATS } from './stats';
export { PROGRESS_VARS } from './progress-vars';
export { REGULAR_VARS } from './regular-vars';
export { ZONES } from './zones';
export { applyLooperOverrides, type ActionOverride, type LooperOverrides } from './overrides';

export const DEFAULT_LOOPER_DATA: LooperData = {
  stats: STATS,
  zones: ZONES,
  progressVars: PROGRESS_VARS,
  regularVars: REGULAR_VARS,
  actions: ACTIONS,
  balance: LOOPER_BALANCE,
};
