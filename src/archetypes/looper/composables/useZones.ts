/**
 * Vue bridge for the zones module.
 */

import { ZONES } from '../data/zones';
import {
  getZoneSystem,
  getCurrentZone,
  unlockZone,
  getProgressVar,
  getProgressVarsForZone,
  getProgressPercent,
  getRegularVar,
  getRegularVarsForZone,
  getRegularGood,
  type ProgressVarState,
  type RegularVarState,
} from '../modules/zones';

export function useZones() {
  const zones = getZoneSystem();

  return {
    /** Static zone definitions */
    zoneDefs: ZONES,
    /** Engine zone system (for ordered, unlocked, current refs) */
    zones,
    /** Currently selected zone ID */
    getCurrentZone,
    /** Unlock (and optionally select) a zone */
    unlockZone,
    /** Get a progress var by id */
    getProgressVar,
    /** Get all progress vars for a zone */
    getProgressVarsForZone,
    /** Progress to next level (0-1) */
    getProgressPercent,
    /** Get a regular var by id */
    getRegularVar,
    /** Get all regular vars for a zone */
    getRegularVarsForZone,
    /** Current good count for a regular var */
    getRegularGood,
  };
}

export type { ProgressVarState, RegularVarState };
