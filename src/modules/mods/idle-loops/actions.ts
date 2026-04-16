/**
 * Idle-loops mod — action registry + dispatch.
 *
 * Uses createContentRegistry for typed action storage and a single
 * createTimedProgress whose duration dynamically reads from the
 * sequencer's current item. Stat levels reduce action duration.
 */
import {
  Decimal,
  createContentRegistry,
  createTimedProgress,
  type ContentRegistry,
  type DecimalSource,
  type TimedProgress,
  type Sequencer,
  type SkillCategory,
  type ZoneSystem,
  type StartResult,
} from 'open-loop-engine';
import type { ActionDef, StatDef } from './content';

// ============================================================================
// Types
// ============================================================================

export interface IdleLoopsActions {
  registry: ContentRegistry<ActionDef>;
  progress: TimedProgress;
  /**
   * Mana cost rate for the currently active action (mana/second).
   * Zero when no action is running.
   */
  currentManaCostRate: () => number;
}

export interface CreateActionsOptions {
  actionDefs: ActionDef[];
  stats: SkillCategory<StatDef>;
  queue: Sequencer;
  zones: ZoneSystem;
  registerTick: (callback: (dt: number) => void) => () => void;
}

// ============================================================================
// Helpers
// ============================================================================

/** Read a skill's level as a plain number. */
function statLevel(stats: SkillCategory<StatDef>, id: string): number {
  const skill = stats.getSkill(id);
  if (!skill) return 0;
  return new Decimal(skill.level.value).toNumber();
}

/** Compute effective duration: baseDuration / (1 + sum(weight_i * level_i) / 50) */
function effectiveDuration(def: ActionDef, stats: SkillCategory<StatDef>): number {
  let statSum = 0;
  for (const [statId, weight] of Object.entries(def.statWeights)) {
    statSum += weight * statLevel(stats, statId);
  }
  return def.baseDuration / (1 + statSum / 50);
}

/**
 * Mana cost rate for an action (mana drained per second while active).
 * Base = baseDuration * 2 (so a full action costs ~2x its base duration in mana),
 * reduced by stat levels: baseCost * product(1 / (1 + level_i * weight_i / 100)).
 */
function manaCostRate(def: ActionDef, stats: SkillCategory<StatDef>): number {
  const baseCost = def.baseDuration * 2;
  let factor = 1;
  for (const [statId, weight] of Object.entries(def.statWeights)) {
    factor *= 1 / (1 + statLevel(stats, statId) * weight / 100);
  }
  return baseCost * factor;
}

// ============================================================================
// Factory
// ============================================================================

export function createIdleLoopsActions(opts: CreateActionsOptions): IdleLoopsActions {
  const { actionDefs, stats, queue, zones, registerTick } = opts;

  // --- Content registry ---
  const registry = createContentRegistry<ActionDef>('il-actions');
  registry.register(actionDefs);

  // --- Sequencer canRun gate ---
  // Zone-locked actions: 'never' (skipped). Stat-gated actions in an
  // unlocked zone: 'notNow' (hold — stats may still grow this run).
  queue.canRun = (item): StartResult => {
    const def = registry.get(item.id);
    if (!def) return 'never';
    if (!zones.isUnlocked(def.zone)) return 'never';
    if (def.requiredStats) {
      for (const [statId, minLevel] of Object.entries(def.requiredStats)) {
        const skill = stats.getSkill(statId);
        if (!skill || Decimal.lt(skill.level.value, minLevel)) return 'notNow';
      }
    }
    return 'now';
  };

  // --- Dynamic duration/speed getters for TimedProgress ---
  function getCurrentDuration(): DecimalSource {
    const current = queue.currentItem;
    if (!current) return 1; // Fallback; speed will be 0 anyway
    const def = registry.get(current.id);
    if (!def) return 1;
    return effectiveDuration(def, stats);
  }

  function getCurrentSpeed(): DecimalSource {
    return queue.currentItem ? 1 : 0;
  }

  // --- Single TimedProgress for the active action ---
  const progress = createTimedProgress({
    id: 'il-action-progress',
    duration: getCurrentDuration,
    speed: getCurrentSpeed,
    registerTick,
    onComplete() {
      const current = queue.currentItem;
      if (!current) return;
      const def = registry.get(current.id);
      if (def) {
        for (const [statId, amount] of Object.entries(def.xpGrants)) {
          stats.addXP(statId, amount);
        }
      }
      progress.reset();
      queue.complete();
    },
  });

  // --- Mana cost for the currently running action ---
  function currentManaCostRate(): number {
    const current = queue.currentItem;
    if (!current) return 0;
    const def = registry.get(current.id);
    if (!def) return 0;
    return manaCostRate(def, stats);
  }

  return { registry, progress, currentManaCostRate };
}
