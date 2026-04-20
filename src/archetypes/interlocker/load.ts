/**
 * Interlocker archetype — vars loader.
 *
 * Deep-merges archetype → theme → balance in that order. Mirrors the
 * looper/producer/scaler loaders — kept deliberately unabstracted so
 * each archetype's merge semantics stay local. Nested balance fields
 * (`buildingCostScaling`) merge shallowly; array fields (`recipes`,
 * `synergies`, `techCosts`, and `archetype.resourcesPerTier` /
 * `buildingCountPerTier`) replace wholesale — a fork that wants partial-
 * array tuning rebuilds the array explicitly.
 */
import { DEFAULT_INTERLOCKER_VARS } from './vars';
import type { InterlockerVars, InterlockerVarsOverride } from './types';

export function loadInterlockerVars(...overrides: InterlockerVarsOverride[]): InterlockerVars {
  return overrides.reduce<InterlockerVars>(
    (acc, override) => mergeInterlockerVars(acc, override),
    DEFAULT_INTERLOCKER_VARS,
  );
}

function mergeInterlockerVars(
  base: InterlockerVars,
  override: InterlockerVarsOverride,
): InterlockerVars {
  return {
    archetype: { ...base.archetype, ...(override.archetype ?? {}) },
    theme: { ...base.theme, ...(override.theme ?? {}) },
    balance: mergeBalance(base.balance, override.balance),
  };
}

function mergeBalance(
  base: InterlockerVars['balance'],
  override: InterlockerVarsOverride['balance'],
): InterlockerVars['balance'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    buildingCostScaling: {
      ...base.buildingCostScaling,
      ...(override.buildingCostScaling ?? {}),
    },
    recipes: override.recipes ?? base.recipes,
    synergies: override.synergies ?? base.synergies,
    techCosts: override.techCosts ?? base.techCosts,
  };
}
