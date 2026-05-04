/**
 * Progress action type — per-def persistent state + tick handler + category shim.
 *
 * Shape mirrors `basic.ts`. At completion, progress-type actions grant
 * exploration XP into a progress var through `addProgressXP`, multiplied by a
 * per-def `gainChain`. `affectedBy` entries bind onto that chain via
 * `registerAffectedByEffects`.
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
  createCategoryBase,
  createModifierChain,
  persistent,
} from 'open-loop-engine';
import type { ActionDef } from '../../data/types';

export interface ProgressState {
  progress: Persistent<DecimalSource>;
  timesCompleted: Persistent<DecimalSource>;
  // gainChain is reset-walked but holds no Persistent refs (modifier closures
  // + computed refs only) — no-op under the Resettable walker.
  gainChain: ModifierChain;
}

export type ProgressTickStatus = 'progressing' | 'completed';

export const progressCategory = createCategoryBase<ActionDef, void, ProgressState>({
  id: 'action-runner/progress',
  buildState: (def) => ({
    progress: persistent<DecimalSource>(0),
    timesCompleted: persistent<DecimalSource>(0),
    gainChain: createModifierChain(`progress:${def.id}:gain`),
  }),
});

export function installProgressOne(def: ActionDef): void {
  if (def.type === 'progress') progressCategory.register(def);
}

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
  const state = progressCategory.getEntry(def.id)?.state;
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
