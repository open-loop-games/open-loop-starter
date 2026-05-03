/**
 * Stat system module — 9 stats with XP, levels, and talents.
 *
 * Two tiers per stat:
 * - **XP** (temporary): Gained from actions, resets each loop. Drives stat
 *   level which reduces action cost via `1 + level/100` divisor.
 * - **Talent** (persistent): Accumulates 1% of every XP gain. Has its own
 *   level (same quadratic formula). Talent level multiplies XP gain.
 *
 * Total bonus XP = calcTalentMult(talentLevel)
 *
 * Built on engine primitives: createResource for XP, persistent for
 * talentXP, computed for levels.
 *
 * Reference: idleLoops/stats.js, idleLoops/actions.js
 */

import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  type DecimalSource,
  type EngineModule,
  type EngineContext,
  type Resource,
  createResource,
  resetResource,
  addResource,
  persistent,
  withPersistentContext,
  type Persistent,
} from 'open-loop-engine';
import { STATS } from '../data/stats';

// ============================================================================
// Formulas (shared quadratic shape from vanilla idle-loops)
// ============================================================================

/**
 * Quadratic level from XP: `floor((sqrt(8 * xp / 100 + 1) - 1) / 2)`
 *
 * Used for stat levels and talent levels.
 * Reference: idleLoops/stats.js getLevelFromExp / getLevelFromTalent
 */
export function levelFromXP(xp: DecimalSource): Decimal {
  return Decimal.floor(
    Decimal.div(
      Decimal.sub(Decimal.sqrt(Decimal.add(Decimal.mul(8, Decimal.div(xp, 100)), 1)), 1),
      2,
    ),
  );
}

/**
 * XP required to reach a given level: `level * (level + 1) * 50`
 *
 * Reference: idleLoops/stats.js getExpOfLevel / getExpOfTalent
 */
export function xpForLevel(level: DecimalSource): Decimal {
  return Decimal.mul(Decimal.mul(level, Decimal.add(level, 1)), 50);
}

/**
 * Talent level → XP multiplier: `1 + talent^0.5 / 5`
 *
 * Reference: idleLoops/actions.js calcTalentMult
 */
export function calcTalentMult(talentLevel: DecimalSource): Decimal {
  return Decimal.add(1, Decimal.div(Decimal.pow(talentLevel, 0.5), 5));
}

// ============================================================================
// Types
// ============================================================================

export interface StatState {
  /** Current XP this loop (resets each loop) */
  readonly xp: Resource<DecimalSource>;
  /** Computed level from XP */
  readonly level: ComputedRef<Decimal>;

  /** Accumulated talent XP (persists across loops, gains 1% of every XP add) */
  readonly talentXP: Persistent<DecimalSource>;
  /** Computed talent level from talent XP */
  readonly talentLevel: ComputedRef<Decimal>;

  /** Talent multiplier: 1 + talentLevel^0.5 / 5 */
  readonly talentMult: ComputedRef<Decimal>;
  /** Combined bonus XP multiplier (talent only — no soulstones in slim demo) */
  readonly totalBonusXP: ComputedRef<Decimal>;
}

// ============================================================================
// Module State (populated in install)
// ============================================================================

const states = new Map<string, StatState>();

// ============================================================================
// Public API
// ============================================================================

/** Get the full stat state for a given stat */
export function getStatState(stat: string): StatState {
  const s = states.get(stat);
  if (!s) throw new Error(`Stat ${stat} not initialized`);
  return s;
}

/** Get all stat states (for iteration / UI) */
export function getAllStatStates(): ReadonlyMap<string, StatState> {
  return states;
}

/**
 * Add XP to a stat. Also accumulates 1% as talent XP.
 *
 * Reference: idleLoops/stats.js addExp
 */
export function addStatXP(stat: string, amount: DecimalSource): void {
  const s = states.get(stat);
  if (!s) return;
  addResource(s.xp, amount);
  // Talent accumulates 1% of every XP gain
  s.talentXP.value = Decimal.add(s.talentXP.value, Decimal.div(amount, 100));
}

/**
 * Reset all stat XP to zero (called on loop restart).
 * Talent is NOT reset.
 */
export function resetStatXP(): void {
  for (const s of states.values()) {
    resetResource(s.xp);
  }
}

/**
 * Get the computed stat level for a stat.
 */
export function getStatLevel(stat: string): Decimal {
  return getStatState(stat).level.value;
}

/**
 * Get the total bonus XP multiplier for a stat.
 */
export function getTotalBonusXP(stat: string): Decimal {
  return getStatState(stat).totalBonusXP.value;
}

/**
 * Progress towards next stat level as 0-1 fraction.
 */
export function getStatXPProgress(stat: string): number {
  const s = getStatState(stat);
  const xp = new Decimal(s.xp.value);
  const currentLevel = s.level.value;
  const xpForCurrent = xpForLevel(currentLevel);
  const xpForNext = xpForLevel(Decimal.add(currentLevel, 1));
  const range = Decimal.sub(xpForNext, xpForCurrent);
  if (range.lte(0)) return 0;
  return Decimal.sub(xp, xpForCurrent).div(range).clamp(0, 1).toNumber();
}

/**
 * XP window for the current level → next level transition.
 */
export function getLevelXPWindow(stat: string): { current: Decimal; needed: Decimal } {
  const s = getStatState(stat);
  const xp = new Decimal(s.xp.value);
  const currentLevel = s.level.value;
  const xpForCurrent = xpForLevel(currentLevel);
  const xpForNext = xpForLevel(Decimal.add(currentLevel, 1));
  return {
    current: Decimal.max(0, Decimal.sub(xp, xpForCurrent)),
    needed: Decimal.sub(xpForNext, xpForCurrent),
  };
}

/** Same shape as getLevelXPWindow, but for the talent track. */
export function getTalentXPWindow(stat: string): { current: Decimal; needed: Decimal } {
  const s = getStatState(stat);
  const xp = new Decimal(s.talentXP.value);
  const currentLevel = s.talentLevel.value;
  const xpForCurrent = xpForLevel(currentLevel);
  const xpForNext = xpForLevel(Decimal.add(currentLevel, 1));
  return {
    current: Decimal.max(0, Decimal.sub(xp, xpForCurrent)),
    needed: Decimal.sub(xpForNext, xpForCurrent),
  };
}

/**
 * Progress towards next talent level as 0-1 fraction.
 */
export function getTalentXPProgress(stat: string): number {
  const s = getStatState(stat);
  const xp = new Decimal(s.talentXP.value);
  const currentLevel = s.talentLevel.value;
  const xpForCurrent = xpForLevel(currentLevel);
  const xpForNext = xpForLevel(Decimal.add(currentLevel, 1));
  const range = Decimal.sub(xpForNext, xpForCurrent);
  if (range.lte(0)) return 0;
  return Decimal.sub(xp, xpForCurrent).div(range).clamp(0, 1).toNumber();
}

// ============================================================================
// Module
// ============================================================================

export const statsModule: EngineModule = {
  id: 'stats',
  install(_ctx: EngineContext) {
    for (const stat of STATS) {
      const { xp, talentXP } = withPersistentContext(`stat:${stat.id}`, () => ({
        // Tier 1: XP (temporary, resets each loop)
        xp: createResource(0, { displayName: `${stat.name} XP`, precision: 0 }),
        // Tier 2: Talent XP (persistent, accumulates 1% of every XP gain)
        talentXP: persistent<DecimalSource>(0, { name: 'talentXP' }),
      }));

      // Computed levels
      const level = computed(() => levelFromXP(xp.value));
      const talentLevel = computed(() => levelFromXP(talentXP.value));

      // Talent multiplier (no soulstones in slim demo — declared invention)
      const talentMult = computed(() => calcTalentMult(talentLevel.value));
      const totalBonusXP = computed(() => talentMult.value);

      states.set(stat.id, {
        xp,
        level,
        talentXP,
        talentLevel,
        talentMult,
        totalBonusXP,
      });
    }
  },
};
