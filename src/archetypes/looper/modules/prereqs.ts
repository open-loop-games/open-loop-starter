import {
  Decimal,
  type Loop,
  type Resource,
  type SkillCategory,
  type DecimalSource,
} from 'open-loop-engine';
import type {
  ActionDef,
  ActionPrereq,
  CapabilityDef,
  LooperGameState,
  ProgressVarDef,
} from '../data/types';
import type { ActionsModule } from './actions';
import type { LooperCapabilityState } from './capabilities';
import type { LooperProgressVarState } from './progress-vars';

/**
 * Inputs needed to materialize a `LooperGameState` view. Each entry matches
 * the shape returned by the corresponding `ctx.inject(*Key)` so callers can
 * pass injection results through verbatim.
 */
export interface LooperGameStateDeps {
  mana: Resource<DecimalSource>;
  gold: Resource<DecimalSource>;
  capabilities: SkillCategory<CapabilityDef, LooperCapabilityState>;
  progressVars: SkillCategory<ProgressVarDef, LooperProgressVarState>;
  actions: ActionsModule;
  loop: Loop;
}

/**
 * Build a read-only `LooperGameState` over live module refs. Single source of
 * truth shared between the queue dispatcher (consumed at engine-tick time)
 * and the `usePrereqs` composable (consumed inside Vue computeds — `.value`
 * reads here track as reactive deps automatically).
 *
 * Data files reference predicate methods through this interface so they stay
 * free of module imports.
 */
export function createLooperGameState(deps: LooperGameStateDeps): LooperGameState {
  return {
    manaAtLeast: (amount) => Decimal.gte(deps.mana.value, amount),
    goldAtLeast: (amount) => Decimal.gte(deps.gold.value, amount),
    capabilityLevelAtLeast: (capabilityId, tier, n) => {
      const state = deps.capabilities.getState(capabilityId);
      if (!state) return false;
      const level = tier === 'level' ? state.level.level.value : state.talent.level.value;
      return Decimal.gte(level, n);
    },
    progressVarLevelAtLeast: (progressVarId, n) => {
      const skill = deps.progressVars.getSkill(progressVarId);
      if (!skill) return false;
      return Decimal.gte(skill.level.value, n);
    },
    actionCompletedAtLeast: (actionId, count) => deps.actions.getTimesCompleted(actionId) >= count,
    loopCountAtLeast: (n) => deps.loop.count.value >= n,
  };
}

/**
 * Match a single prereq against a state view. Exhaustive over `ActionPrereq`'s
 * discriminated kinds; the `'always'` variant is the explicit-no-op annotation
 * (data-side equivalent of omitting `prereqs` entirely).
 */
export function evaluatePrereq(prereq: ActionPrereq, state: LooperGameState): boolean {
  switch (prereq.kind) {
    case 'always':
      return true;
    case 'progress-var-level':
      return state.progressVarLevelAtLeast(prereq.progressVarId, prereq.value);
    case 'capability-tier-level':
      return state.capabilityLevelAtLeast(prereq.capabilityId, prereq.tier, prereq.value);
    case 'action-completion-count':
      return state.actionCompletedAtLeast(prereq.actionId, prereq.value);
    case 'loop-count':
      return state.loopCountAtLeast(prereq.value);
  }
}

/**
 * Visibility = `prereqs.every(matched)`. AND across entries; missing or empty
 * `prereqs` resolves to true (always-visible). Drives the action drawer's
 * progressive disclosure — actions stay hidden until every prereq passes.
 */
export function isActionVisible(def: ActionDef, state: LooperGameState): boolean {
  if (!def.prereqs || def.prereqs.length === 0) return true;
  return def.prereqs.every((p) => evaluatePrereq(p, state));
}

/**
 * Runnability = visibility AND `canStart` (when defined). Future hook for
 * dim-locking visible-but-not-runnable rows; currently no action defines
 * `canStart` so this resolves identically to `isActionVisible`.
 */
export function isActionRunnable(def: ActionDef, state: LooperGameState): boolean {
  if (!isActionVisible(def, state)) return false;
  if (def.canStart && !def.canStart(state)) return false;
  return true;
}
