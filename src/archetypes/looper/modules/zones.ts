/**
 * Zone system module — 2 zones with progress/regular var tracking.
 *
 * Wraps the engine's createZoneSystem for zone definitions, unlock, and
 * selection. Adds game-side town variable state:
 *
 * - **Progress vars**: exploration XP per action (persists across loops).
 *   Engine `createSkillCategory` with shared quadratic level formula.
 *   Level-up reactions fire via `onLevelUp` callbacks (data-driven from
 *   each ProgressVarDef's `scales` table — declared invention).
 * - **Regular vars**: check/reward tracking for "search N, find M" actions.
 *   `total`, `good`, `goodTemp`, and `checked` persist; `lootFrom` resets each loop.
 *
 * Level-up → pool-resize coupling is data-driven: when a progressVar levels
 * up, each entry in its `scales` array triggers a full recompute of that
 * regularVar's total (summing all contributing progressVars). This replaces
 * vanilla's hardcoded switch statement with the looper's declared scales table.
 *
 * Reference: idleLoops/town.js, idle-loops-ng/src/modules/zones.ts
 */

import {
  Decimal,
  type DecimalSource,
  type EngineModule,
  type EngineContext,
  type ZoneSystem,
  type Skill,
  type SkillCategory,
  type ModifierChain,
  type Persistent,
  createZoneSystem,
  createSkillCategory,
  createModifierChain,
  getSkillProgress,
  Formula,
  persistent,
  withPersistentContext,
} from 'open-loop-engine';
import { ZONES } from '../data/zones';
import { PROGRESS_VARS } from '../data/progress-vars';
import { REGULAR_VARS } from '../data/regular-vars';
import type { ProgressVarDef } from '../data/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Progress var info — thin view over a skill category entry for API consumers.
 */
export interface ProgressVarState {
  readonly id: string;
  readonly name: string;
  readonly zoneId: string;
  readonly level: Skill['level'];
  readonly skill: Skill;
}

/**
 * State for a regular var (check/reward tracking).
 *
 * - `total`: how many exist (persistent, set by exploration level-up)
 * - `good`: how many "good" ones found (persistent, accumulates across loops)
 * - `goodTemp`: remaining "good" to find this loop
 * - `checked`: lifetime count of items checked (persistent, never reset)
 * - `lootFrom`: accumulated reward this loop (reset on restart)
 */
export interface RegularVarState {
  readonly id: string;
  readonly name: string;
  readonly zoneId: string;
  readonly total: Persistent<number>;
  readonly good: Persistent<number>;
  readonly goodTemp: Persistent<number>;
  readonly checked: Persistent<number>;
  /** Prefer burning known-goods before exploring new items. Default: true. */
  readonly valuablesFirst: Persistent<boolean>;
  lootFrom: number;
  base: number;
}

// ============================================================================
// Module State (populated in install)
// ============================================================================

let zones: ZoneSystem;

/** Skill category for progress vars. */
let progressSkills: SkillCategory<ProgressVarDef>;

const regularVars = new Map<string, RegularVarState>();

/** Per-var modifier chains for regular-var totals. */
const regularChains = new Map<string, ModifierChain>();

// ============================================================================
// Public API — zone system
// ============================================================================

/** Get the engine zone system */
export function getZoneSystem(): ZoneSystem {
  return zones;
}

/** Get the currently selected zone ID */
export function getCurrentZone(): string {
  return zones.current.value;
}

/** Unlock a zone and optionally select it */
export function unlockZone(zoneId: string, andSelect = false): void {
  zones.unlock(zoneId);
  if (andSelect) zones.select(zoneId);
}

// ============================================================================
// Public API — progress vars
// ============================================================================

/** Get a progress var by id */
export function getProgressVar(id: string): ProgressVarState {
  const entry = progressSkills.getEntry(id);
  if (!entry) throw new Error(`Progress var ${id} not found`);
  return {
    id: entry.def.id,
    name: entry.def.name,
    zoneId: entry.def.zoneId,
    level: entry.skill.level,
    skill: entry.skill,
  };
}

/** Get the current level of a progress var as a plain number. Returns 0 if not found. */
export function getProgressLevel(id: string): number {
  const skill = progressSkills.getSkill(id);
  if (!skill) return 0;
  return new Decimal(skill.level.value).toNumber();
}

/** Get all progress vars for a zone */
export function getProgressVarsForZone(zoneId: string): ProgressVarState[] {
  return progressSkills
    .getAll()
    .filter((e) => e.def.zoneId === zoneId)
    .map((e) => ({
      id: e.def.id,
      name: e.def.name,
      zoneId: e.def.zoneId,
      level: e.skill.level,
      skill: e.skill,
    }));
}

/**
 * Add exploration XP to a progress var.
 * Level-up reactions fire via onLevelUp callbacks → resize regularVar pools.
 *
 * Reference: town.js finishProgress
 */
export function addProgressXP(id: string, amount: DecimalSource): void {
  progressSkills.addXp(id, amount);
}

/**
 * Progress towards next level as 0-1 fraction.
 */
export function getProgressPercent(id: string): number {
  const skill = progressSkills.getSkill(id);
  if (!skill) return 0;
  return getSkillProgress(skill);
}

// ============================================================================
// Public API — regular vars
// ============================================================================

/** Get a regular var by id */
export function getRegularVar(id: string): RegularVarState {
  const rv = regularVars.get(id);
  if (!rv) throw new Error(`Regular var ${id} not found`);
  return rv;
}

/** Get all regular vars for a zone */
export function getRegularVarsForZone(zoneId: string): RegularVarState[] {
  return [...regularVars.values()].filter((rv) => rv.zoneId === zoneId);
}

/**
 * Get the current "good count" for a regular var.
 */
export function getRegularGood(id: string): number {
  return regularVars.get(id)?.good.value ?? 0;
}

/**
 * Execute the "check one item" logic for a regular var.
 *
 * If unchecked items remain, checks one. Every `rewardRatio`th check finds a
 * "good" one. If goodTemp > 0, uses a known-good item instead.
 *
 * Reference: town.js finishRegular
 */
export function finishRegular(id: string, rewardRatio: number, rewardFunc: () => number): void {
  const rv = regularVars.get(id);
  if (!rv) return;

  // Error state fix (vanilla safety check)
  if (rv.total.value - rv.checked.value < 0) {
    rv.checked.value = rv.total.value;
    rv.good.value = Math.floor(rv.total.value / rewardRatio);
    rv.goodTemp.value = rv.good.value;
  }

  const searchToggle = rv.valuablesFirst.value;
  const unchecked = rv.total.value - rv.checked.value;
  if (unchecked > 0 && (!searchToggle || rv.goodTemp.value <= 0)) {
    rv.checked.value++;
    if (rv.checked.value % rewardRatio === 0) {
      rv.lootFrom += rewardFunc();
      rv.good.value++;
    }
  } else if (rv.goodTemp.value > 0) {
    rv.goodTemp.value--;
    rv.lootFrom += rewardFunc();
  }
}

/**
 * Set the base total for a regular var (called from level-up reactions).
 */
export function setRegularTotal(id: string, total: number): void {
  const rv = regularVars.get(id);
  if (!rv) return;
  rv.base = total;
  const chain = regularChains.get(id);
  rv.total.value = chain ? Math.floor(new Decimal(chain.apply(total)).toNumber()) : total;
}

// ============================================================================
// Public API — loop restart
// ============================================================================

/**
 * Reset per-loop zone state on loop restart.
 *
 * - Regular vars: set goodTemp = good, lootFrom = 0
 * - Zone selection back to beginnersville
 *
 * Progress var XP is NOT reset (persists across loops).
 *
 * Reference: town.js restart()
 */
export function restartZones(): void {
  for (const rv of regularVars.values()) {
    rv.goodTemp.value = rv.good.value;
    rv.lootFrom = 0;
  }
  zones.select('beginnersville');
}

// ============================================================================
// Level-up reactions (data-driven from scales table — declared invention)
// ============================================================================

/**
 * Recompute a regularVar's total by summing all contributing progressVars.
 *
 * Multi-axis example: herbs.total = forest.level × 5 + shortcut.level × 2
 * (both forest and shortcut carry a herbs entry in their scales arrays).
 */
function resizeRegularVar(rvId: string): void {
  let total = 0;
  for (const pv of PROGRESS_VARS) {
    const scale = pv.scales.find((s) => s.regularVarId === rvId);
    if (!scale) continue;
    total += getProgressLevel(pv.id) * new Decimal(scale.perLevel).toNumber();
  }
  setRegularTotal(rvId, total);
}

/**
 * Build an onLevelUp callback for a progress var. Returns undefined when the
 * def's scales array is empty (no pool coupling).
 *
 * Uses the looper's scales table (declared invention) instead of a hardcoded
 * switch — each entry names the regularVars to resize on level-up.
 */
function buildLevelUpCallback(
  def: ProgressVarDef,
): ((oldLevel: Decimal, newLevel: Decimal) => void) | undefined {
  if (!def.scales || def.scales.length === 0) return undefined;
  const affectedRvIds = [...new Set(def.scales.map((s) => s.regularVarId))];
  return () => {
    for (const rvId of affectedRvIds) {
      resizeRegularVar(rvId);
    }
  };
}

// ============================================================================
// Module
// ============================================================================

export const zonesModule: EngineModule = {
  id: 'zones',
  install(_ctx: EngineContext) {
    withPersistentContext('zones', () => {
      // --- Engine zone system ---
      zones = createZoneSystem({
        zones: ZONES,
        initiallyUnlocked: ['beginnersville'],
      });

      // --- Progress vars (engine skill category) ---
      // Quadratic level formula: floor((sqrt(8*xp/100 + 1) - 1) / 2)
      progressSkills = createSkillCategory<ProgressVarDef>({
        id: 'progress',
        mapSkill: (def) => ({
          xpToLevel: (xp) =>
            Formula.variable(xp).mul(8).div(100).add(1).sqrt().sub(1).div(2).floor(),
          levelToMultiplier: (level) => level,
          onLevelUp: buildLevelUpCallback(def),
        }),
      });
      progressSkills.register(PROGRESS_VARS);

      // --- Regular vars ---
      for (const def of REGULAR_VARS) {
        const { total, good, goodTemp, checked, valuablesFirst } = withPersistentContext(
          `regular:${def.id}`,
          () => ({
            total: persistent(0),
            good: persistent(0),
            goodTemp: persistent(0),
            checked: persistent(0),
            valuablesFirst: persistent(true),
          }),
        );

        regularVars.set(def.id, {
          id: def.id,
          name: def.name,
          zoneId: def.zoneId,
          total,
          good,
          goodTemp,
          checked,
          valuablesFirst,
          lootFrom: 0,
          base: 0,
        });
        regularChains.set(def.id, createModifierChain(`regular-total:${def.id}`));
      }
    });
  },
};
