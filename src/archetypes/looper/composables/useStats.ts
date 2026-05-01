/**
 * Vue bridge for the stats module.
 */

import { STATS } from '../data/stats';
import {
  getAllStatStates,
  getStatState,
  getStatLevel,
  getTotalBonusXP,
  getStatXPProgress,
  getTalentXPProgress,
  getLevelXPWindow,
  getTalentXPWindow,
  type StatState,
} from '../modules/stats';

export function useStats() {
  return {
    /** Static stat definitions */
    stats: STATS,
    /** All stat states (reactive map) */
    allStats: getAllStatStates(),
    /** Get state for one stat */
    getStatState,
    /** Get computed level for a stat */
    getStatLevel,
    /** Get total bonus XP multiplier */
    getTotalBonusXP,
    /** XP progress to next level (0-1) */
    getStatXPProgress,
    /** Talent XP progress to next level (0-1) */
    getTalentXPProgress,
    /** Raw XP window { current, needed } for the level bar */
    getLevelXPWindow,
    /** Raw XP window { current, needed } for the talent bar */
    getTalentXPWindow,
  };
}

export type { StatState };
