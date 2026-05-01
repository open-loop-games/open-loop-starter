/**
 * Vue bridge for the action runner module.
 */

import { Decimal } from 'open-loop-engine';
import type { ActionDef } from '../data/types';
import {
  getActionRegistry,
  getActionDef,
  isActionVisible,
  calcTotalTicksNeeded,
  getTimesCompleted,
  basicCategory,
  progressCategory,
  regularCategory,
} from '../modules/action-runner';
import { computeAdjustedTicks, getNumOnList } from '../modules/action-formulas';

/**
 * Read the current-progress percentage (0..1) for an action by id.
 */
function getActionProgress(id: string): number {
  const def = getActionDef(id);
  if (!def) return 0;
  const adjusted = computeAdjustedTicks(def);
  if (Decimal.lte(adjusted, 0)) return 0;
  const state =
    def.type === 'basic'
      ? basicCategory.getState(id)
      : def.type === 'progress'
        ? progressCategory.getState(id)
        : def.type === 'regular'
          ? regularCategory.getState(id)
          : undefined;
  if (!state) return 0;
  return Math.min(1, Math.max(0, Decimal.div(state.progress.value, adjusted).toNumber()));
}

export function useActionRunner() {
  return {
    /** Action definition registry */
    actionRegistry: getActionRegistry(),
    /** Get a definition by ID */
    getActionDef,
    /** Per-def progress percentage (0..1) */
    getActionProgress,
    /** Count of action in current active queue */
    getNumOnList,
    /** Check if action is currently visible (prereqs match) */
    isActionVisible,
    /** Compute adjusted ticks for a definition */
    computeAdjustedTicks,
    /** Total remaining mana needed for queued actions */
    calcTotalTicksNeeded,
    /** Get total times completed for an action (across all categories) */
    getTimesCompleted,
  };
}

export type { ActionDef };
