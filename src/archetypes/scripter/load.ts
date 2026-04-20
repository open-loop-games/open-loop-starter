/**
 * Scripter archetype — vars loader.
 *
 * Deep-merges archetype → theme → balance in that order. Mirrors the
 * looper / interlocker / producer / scaler / explorer loaders — kept
 * deliberately unabstracted so each archetype's merge semantics stay
 * local. Nested balance fields (`augmentationCurve`,
 * `augmentationCostScaling`, `scriptEfficiencyBonus`) merge shallowly;
 * `actionTimings` replaces wholesale when supplied (command-vocab
 * tuning is all-or-nothing per command set).
 */
import { DEFAULT_SCRIPTER_VARS } from './vars';
import type { ScripterVars, ScripterVarsOverride } from './types';

export function loadScripterVars(...overrides: ScripterVarsOverride[]): ScripterVars {
  return overrides.reduce<ScripterVars>(
    (acc, override) => mergeScripterVars(acc, override),
    DEFAULT_SCRIPTER_VARS,
  );
}

function mergeScripterVars(base: ScripterVars, override: ScripterVarsOverride): ScripterVars {
  return {
    archetype: { ...base.archetype, ...(override.archetype ?? {}) },
    theme: { ...base.theme, ...(override.theme ?? {}) },
    balance: mergeBalance(base.balance, override.balance),
  };
}

function mergeBalance(
  base: ScripterVars['balance'],
  override: ScripterVarsOverride['balance'],
): ScripterVars['balance'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    tier2UnlockThreshold: override.tier2UnlockThreshold ?? base.tier2UnlockThreshold,
    tier3UnlockThreshold: override.tier3UnlockThreshold ?? base.tier3UnlockThreshold,
    actionTimings: override.actionTimings ?? base.actionTimings,
    augmentationCurve: {
      ...base.augmentationCurve,
      ...(override.augmentationCurve ?? {}),
    },
    augmentationCostScaling: {
      ...base.augmentationCostScaling,
      ...(override.augmentationCostScaling ?? {}),
    },
    scriptEfficiencyBonus: {
      ...base.scriptEfficiencyBonus,
      ...(override.scriptEfficiencyBonus ?? {}),
    },
  };
}
