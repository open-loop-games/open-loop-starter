/**
 * Access the looper data constants — action defs, capability defs, zone defs,
 * progress/regular var defs, and balance. Use for tooltip copy, picker labels,
 * and data lookups that need the raw definitions without module state.
 */

import { ACTIONS } from '../data/actions';
import { CAPABILITIES } from '../data/capabilities';
import { ZONES } from '../data/zones';
import { PROGRESS_VARS } from '../data/progress-vars';
import { REGULAR_VARS } from '../data/regular-vars';
import { LOOPER_BALANCE } from '../data/balance';

export function useLooperData() {
  return {
    actions: ACTIONS,
    capabilities: CAPABILITIES,
    zones: ZONES,
    progressVars: PROGRESS_VARS,
    regularVars: REGULAR_VARS,
    balance: LOOPER_BALANCE,
  };
}
