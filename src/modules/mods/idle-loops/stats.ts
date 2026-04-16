/**
 * Idle-loops mod — stat system setup.
 *
 * Wraps createSkillCategory in accumulator mode for RPG stats.
 * Each stat retains a fraction of its level across loop resets.
 */
import {
  Formula,
  createSkillCategory,
  type SkillCategory,
} from 'open-loop-engine';
import type { StatDef } from './content';

export function createIdleLoopsStats(defs: StatDef[]): SkillCategory<StatDef> {
  const skills = createSkillCategory<StatDef>({
    id: 'il-stats',
    mapSkill: (def) => ({
      xpToLevel: (xp) => Formula.variable(xp).div(def.xpDivisor).floor(),
      retentionFormula: (level) => Formula.variable(level).mul(def.retentionRate),
      description: def.description,
    }),
  });

  skills.register(defs);
  return skills;
}
