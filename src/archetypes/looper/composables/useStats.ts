/**
 * Vue bridge for the stats module.
 */

import { STATS } from '../data/stats';
import {
  getStatLevelSkills,
  getTalentSkills,
  getStatLevelSkill,
  getTalentSkill,
  getStatLevel,
  getTalentLevel,
  getTalentMult,
  getStatXPProgress,
  getTalentXPProgress,
  getLevelXPWindow,
  getTalentXPWindow,
} from '../modules/stats';

export function useStats() {
  return {
    /** Static stat definitions */
    stats: STATS,
    /** SkillCategory of per-loop stat-XP skills */
    statLevelSkills: getStatLevelSkills(),
    /** SkillCategory of cross-loop talent skills */
    talentSkills: getTalentSkills(),
    /** Get the stat-level Skill for a stat (per-loop xp/level) */
    getStatLevelSkill,
    /** Get the talent Skill for a stat (cross-loop xp/level/multiplier) */
    getTalentSkill,
    /** Stat level (per-loop xp → level) */
    getStatLevel,
    /** Talent level (cross-loop xp → level) */
    getTalentLevel,
    /** Talent multiplier (1 + talentLevel^0.5 / 5) */
    getTalentMult,
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
