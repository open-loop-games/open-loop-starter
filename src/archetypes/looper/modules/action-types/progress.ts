/**
 * Progress action type — per-def persistent state + tick handler + category shim.
 *
 * Shape mirrors `basic.ts`. The difference is at completion: progress-type
 * actions grant exploration XP into a progress var through `addProgressXP`,
 * multiplied by a per-def `gainChain`. `affectedBy` entries bind onto that
 * chain via `registerAffectedByEffects`.
 *
 * The gainChain lives on ProgressState — it was previously on the engine
 * Action instance, but dispatcher-owned action types no longer instantiate
 * Action objects, so ownership moved here. The engine's ModifierChain
 * primitive is standalone (createModifierChain), no Action required.
 *
 * Per-def state tracks tick-wise progress toward `computeAdjustedTicks(def)`
 * (same mechanic as basic), plus `timesCompleted` for UI. The progress-var
 * itself lives in the skills category in `zones.ts` and is shared across
 * every def that targets the same `progressVarId`.
 */

import {
  Decimal,
  type DecimalSource,
  type ModifierChain,
  type Persistent,
  createModifierChain,
  persistent,
} from 'open-loop-engine';
import type { ActionDef } from '../../data/types';
import { createActionTypeCategory } from './category-factory';

export interface ProgressState {
  progress: Persistent<DecimalSource>;
  timesCompleted: Persistent<DecimalSource>;
  gainChain: ModifierChain;
}

export type ProgressTickStatus = 'progressing' | 'completed';

export const progressCategory = createActionTypeCategory<ProgressState>({
  typeTag: 'progress',
  build: (def) => ({
    progress: persistent<DecimalSource>(0),
    timesCompleted: persistent<DecimalSource>(0),
    gainChain: createModifierChain(`progress:${def.id}:gain`),
  }),
});

export const installProgressOne = progressCategory.installOne;

/**
 * Advance a progress action's tick counter. On crossing `adjusted`, resets
 * progress to zero and bumps `timesCompleted`. The dispatcher is responsible
 * for granting progress-var XP via `addProgressXP` after a `'completed'`
 * return — this handler only tracks the per-def tick state.
 */
export function dispatchProgress(
  def: ActionDef,
  gainPerTick: number,
  adjusted: Decimal,
): ProgressTickStatus {
  const state = progressCategory.getState(def.id);
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
