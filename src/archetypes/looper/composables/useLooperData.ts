/**
 * Access the looper data constants — action defs, stat defs, zone defs,
 * progress/regular var defs, and balance. Use for tooltip copy, picker labels,
 * and data lookups that need the raw definitions without module state.
 */

import { ACTIONS } from '../data/actions';
import { STATS } from '../data/stats';
import { ZONES } from '../data/zones';
import { PROGRESS_VARS } from '../data/progress-vars';
import { REGULAR_VARS } from '../data/regular-vars';
import { LOOPER_BALANCE } from '../data/balance';

export function useLooperData() {
  return {
    actions: ACTIONS,
    stats: STATS,
    zones: ZONES,
    progressVars: PROGRESS_VARS,
    regularVars: REGULAR_VARS,
    balance: LOOPER_BALANCE,
  };
}
