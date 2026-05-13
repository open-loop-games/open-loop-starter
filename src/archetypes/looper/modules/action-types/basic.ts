/**
 * Basic action type — per-def persistent state + tick handler + category shim.
 *
 * Basic is the simplest of IL's four action types: no tracker, no multipart,
 * no affectedBy, no canProgress stall. Progress accumulates per tick against
 * `computeAdjustedTicks(def)`; completion fires the def's `completionCallback`
 * and the engine applies `completionEffects`/`completionCost` when the
 * dispatcher calls `queue.complete()`.
 */

import {
  Decimal,
  type DecimalSource,
  type Persistent,
  persistent,
  createCategoryBase,
} from '@open-loop/engine';
import type { ActionDef } from '../../data/types';

export interface BasicState {
  progress: Persistent<DecimalSource>;
  timesCompleted: Persistent<DecimalSource>;
}

export type BasicTickStatus = 'progressing' | 'completed';

export const basicCategory = createCategoryBase<ActionDef, void, BasicState>({
  id: 'action-runner/basic',
  buildState: () => ({
    progress: persistent<DecimalSource>(0),
    timesCompleted: persistent<DecimalSource>(0),
  }),
});

export function installBasicOne(def: ActionDef): void {
  if (def.type === 'basic') basicCategory.register(def);
}

/**
 * Advance a basic action's progress by one tick.
 *
 * `gainPerTick` is the per-tick progress increment — dispatcher passes
 * `tickRate * dt * speedMult * ticksAmt`. On crossing `adjusted`, resets
 * progress to zero and bumps `timesCompleted`.
 */
export function dispatchBasic(
  def: ActionDef,
  gainPerTick: number,
  adjusted: Decimal,
): BasicTickStatus {
  const state = basicCategory.getEntry(def.id)?.state;
  if (!state) return 'progressing';
  const next = Decimal.add(state.progress.value, gainPerTick);
  if (Decimal.gte(next, adjusted)) {
    state.progress.value = 0;
    state.timesCompleted.value = Decimal.add(state.timesCompleted.value, 1);
    return 'completed';
  }
  state.progress.value = next;
  return 'progressing';
}
