/**
 * Regular action type — per-def persistent state + tick handler + category shim.
 *
 * Shape mirrors `basic.ts` and `progress.ts`. Regular is IL's "check a pool
 * until you find a good one" type (smash-pots, pick-locks, short-quest): each
 * completion calls `finishRegular` which increments a shared `regularVar`
 * counter and conditionally awards `rewardEffects` on a good-find. The
 * regularVar state itself lives in `zones.ts`, shared across every def that
 * targets the same `regularVarId` — this handler only owns the per-def
 * tick state.
 *
 * No gainChain wiring: `affectedBy` is a progress-type feature, not declared
 * by any regular def. No loopStats either — those are multipart-only.
 */

import {
  Decimal,
  type DecimalSource,
  type Persistent,
  persistent,
  createCategoryBase,
} from '@open-loop/engine';
import type { ActionDef } from '../../data/types';

export interface RegularState {
  progress: Persistent<DecimalSource>;
  timesCompleted: Persistent<DecimalSource>;
}

export type RegularTickStatus = 'progressing' | 'completed';

export const regularCategory = createCategoryBase<ActionDef, void, RegularState>({
  id: 'action-runner/regular',
  buildState: () => ({
    progress: persistent<DecimalSource>(0),
    timesCompleted: persistent<DecimalSource>(0),
  }),
});

export function installRegularOne(def: ActionDef): void {
  if (def.type === 'regular') regularCategory.register(def);
}

/**
 * Advance a regular action's tick counter. On crossing `adjusted`, resets
 * progress to zero and bumps `timesCompleted`. The dispatcher is responsible
 * for invoking `finishRegular` (pool-check + conditional rewardEffects)
 * after a `'completed'` return.
 */
export function dispatchRegular(
  def: ActionDef,
  gainPerTick: number,
  adjusted: Decimal,
): RegularTickStatus {
  const state = regularCategory.getEntry(def.id)?.state;
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
