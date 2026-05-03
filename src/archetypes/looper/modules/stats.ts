/**
 * Stat system module — 9 stats with two-tier engine Skill instances.
 *
 * Each stat has two `SkillCategory` entries:
 * - **stat-level**: per-loop XP → level. Level used as cost divisor
 *   (`1 + level/100`) at the action site. In `loop.thingsToReset`.
 * - **talent**: cross-loop XP → level → multiplier (`1 + level^0.5 / 5`).
 *   NOT in any reset. Talent's modifier binds onto BOTH gainChains in
 *   `connect()` so the canonical positive-feedback holds (talent boosts
 *   incoming XP on both tiers; talent itself accrues `talentAccrualRatio`
 *   of every gain). Math reduces to vanilla:
 *
 *     boosted = raw × talentMult
 *     xp           += boosted
 *     talentXP     += boosted × talentAccrualRatio
 *
 * Reference: idleLoops/stats.js, idle-loops-ng/src/modules/stats.ts
 */

import {
  Decimal,
  type DecimalSource,
  type EngineModule,
  type EngineContext,
  type SkillCategory,
  type Skill,
  type InjectionKey,
  createSkillCategory,
  Formula,
  getSkillProgress,
  getSkillXPWindow,
} from 'open-loop-engine';
import type { MaybeRef } from 'vue';
import { STATS } from '../data/stats';
import { LOOPER_BALANCE } from '../data/balance';
import type { StatDef } from '../data/types';

// ============================================================================
// Injection keys (inline-in-publisher)
// ============================================================================

export const StatLevelCategoryKey: InjectionKey<SkillCategory<StatDef>> = Symbol(
  'looper:stat-level-skills',
);
export const TalentCategoryKey: InjectionKey<SkillCategory<StatDef>> =
  Symbol('looper:talent-skills');

// ============================================================================
// Curves (Formula factories — bind to skill-internal refs)
// ============================================================================

/**
 * Quadratic xp→level: `floor((sqrt(8 * xp / 100 + 1) - 1) / 2)`.
 * Shared by stat-level and talent tiers.
 *
 * Reference: idleLoops/stats.js getLevelFromExp / getLevelFromTalent
 */
function statXpToLevel(xp: MaybeRef<DecimalSource>) {
  return Formula.variable(xp).div(100).times(8).add(1).sqrt().sub(1).div(2).floor();
}

/**
 * Talent modifier: `1 + level^0.5 / 5`.
 *
 * Reference: idleLoops/actions.js calcTalentMult
 */
function talentLevelToMultiplier(level: MaybeRef<DecimalSource>) {
  return Formula.variable(level).pow(0.5).div(5).add(1);
}

// ============================================================================
// Module state (populated in install)
// ============================================================================

let statLevelSkills: SkillCategory<StatDef>;
let talentSkills: SkillCategory<StatDef>;

// ============================================================================
// Public API — direct skill access
// ============================================================================

export function getStatLevelSkills(): SkillCategory<StatDef> {
  return statLevelSkills;
}

export function getTalentSkills(): SkillCategory<StatDef> {
  return talentSkills;
}

export function getStatLevelSkill(stat: string): Skill {
  const s = statLevelSkills.getSkill(stat);
  if (!s) throw new Error(`Stat ${stat} not initialized`);
  return s;
}

export function getTalentSkill(stat: string): Skill {
  const s = talentSkills.getSkill(stat);
  if (!s) throw new Error(`Talent ${stat} not initialized`);
  return s;
}

// ============================================================================
// Public API — value reads
// ============================================================================

export function getStatLevel(stat: string): Decimal {
  return new Decimal(getStatLevelSkill(stat).level.value);
}

export function getTalentLevel(stat: string): Decimal {
  return new Decimal(getTalentSkill(stat).level.value);
}

/**
 * Talent multiplier for a stat: `1 + talentLevel^0.5 / 5`.
 * Drives the talentMult tooltip + stays the formula source of truth.
 */
export function getTalentMult(stat: string): Decimal {
  const level = getTalentLevel(stat);
  return Decimal.add(1, Decimal.div(Decimal.pow(level, 0.5), 5));
}

// ============================================================================
// Public API — XP grant
// ============================================================================

/**
 * Grant raw XP to a stat. Both gainChains apply the talent multiplier in
 * `connect()`-bound binding, so the boosted amount lands on the level skill
 * and `boosted × talentAccrualRatio` lands on the talent skill.
 *
 * Reference: idleLoops/stats.js addExp; idle-loops-ng/src/modules/stats.ts
 */
export function addStatXP(stat: string, rawAmount: DecimalSource): void {
  statLevelSkills.addXp(stat, rawAmount);
  talentSkills.addXp(stat, Decimal.mul(rawAmount, LOOPER_BALANCE.talentAccrualRatio));
}

// ============================================================================
// Public API — UI helpers (progress fractions + xp windows)
// ============================================================================

export function getStatXPProgress(stat: string): number {
  return getSkillProgress(getStatLevelSkill(stat));
}

export function getTalentXPProgress(stat: string): number {
  return getSkillProgress(getTalentSkill(stat));
}

export function getLevelXPWindow(stat: string): { current: Decimal; needed: Decimal } {
  const w = getSkillXPWindow(getStatLevelSkill(stat));
  return { current: new Decimal(w.current), needed: new Decimal(w.needed) };
}

export function getTalentXPWindow(stat: string): { current: Decimal; needed: Decimal } {
  const w = getSkillXPWindow(getTalentSkill(stat));
  return { current: new Decimal(w.current), needed: new Decimal(w.needed) };
}

// ============================================================================
// Module
// ============================================================================

export const statsModule: EngineModule = {
  id: 'stats',
  install(ctx: EngineContext) {
    statLevelSkills = createSkillCategory<StatDef>({
      id: 'stat-level',
      mapSkill: (def) => ({
        xpToLevel: statXpToLevel,
        // Modifier unused — `level` is read directly as a cost divisor at the
        // action site (`1 + level/100`), not bound to a chain.
        levelToMultiplier: () => Formula.constant(1),
        description: `${def.name} level`,
      }),
    });

    talentSkills = createSkillCategory<StatDef>({
      id: 'talent',
      mapSkill: (def) => ({
        xpToLevel: statXpToLevel,
        levelToMultiplier: talentLevelToMultiplier,
        description: `${def.name} talent`,
      }),
    });

    statLevelSkills.register(STATS);
    talentSkills.register(STATS);

    ctx.provide(StatLevelCategoryKey, statLevelSkills);
    ctx.provide(TalentCategoryKey, talentSkills);
  },

  connect(_ctx: EngineContext) {
    // Bind talent's modifier onto both stat-level and talent gainChains.
    // Done post-install so both categories are constructed. The binding gives
    // `addXp(raw)` the talent boost on both tiers, preserving the canonical
    // positive-feedback shape from vanilla idle-loops without manual
    // talentMult application at the call site.
    for (const def of STATS) {
      const talentMod = talentSkills.getSkill(def.id)!.modifier;
      statLevelSkills.getSkill(def.id)!.gainChain.add(talentMod);
      talentSkills.getSkill(def.id)!.gainChain.add(talentMod);
    }
  },
};
