import { useModule } from '@/composables/useModule';
import type { ActionDef } from '../data/types';
import {
  ActionsKey,
  CapabilitiesKey,
  GoldKey,
  LoopKey,
  ManaKey,
  ProgressVarsKey,
} from '../modules';
import { createLooperGameState, isActionRunnable, isActionVisible } from '../modules/prereqs';

export interface PrereqsView {
  /**
   * Visibility = `def.prereqs.every(matched)`. Drives drawer / town column
   * filtering. Reads `.value` on underlying refs through the shared game-state
   * view, so calling inside a Vue `computed(...)` registers the right reactive
   * deps and the result re-evaluates when capability levels, progressVars,
   * loop count, or action completion counts change.
   */
  isVisible(def: ActionDef): boolean;
  /**
   * Runnability = visibility AND `canStart`. No current action defines
   * `canStart`, so this resolves identically to `isVisible` today; kept
   * separate so leaf 2's tile dim-lock (if we revisit hide-vs-dim) can flip
   * to runnability without touching call sites.
   */
  isUnlocked(def: ActionDef): boolean;
}

/**
 * Vue-side view over the same `LooperGameState` the queue dispatcher uses.
 * Single source of truth for prereq evaluation — the queue and the UI both
 * call `evaluatePrereq` (queue indirectly via `def.canStart` reading the same
 * state shape, UI via these helpers).
 */
export function usePrereqs(): PrereqsView {
  const mana = useModule(ManaKey);
  const gold = useModule(GoldKey);
  const capabilities = useModule(CapabilitiesKey);
  const progressVars = useModule(ProgressVarsKey);
  const actions = useModule(ActionsKey);
  const loop = useModule(LoopKey);

  const state = createLooperGameState({
    mana,
    gold,
    capabilities,
    progressVars,
    actions,
    loop,
  });

  return {
    isVisible: (def) => isActionVisible(def, state),
    isUnlocked: (def) => isActionRunnable(def, state),
  };
}
