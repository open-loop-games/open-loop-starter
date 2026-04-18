/**
 * Scaler archetype — vars loader.
 *
 * Deep-merges archetype → theme → balance in that order. Mirrors the
 * looper/producer loaders — kept deliberately unabstracted so each
 * archetype's merge semantics stay local. Nested balance fields
 * (`baseDimensionCost`) merge shallowly; array fields
 * (`prestigeConversions`, `softcapThresholds`, `layerUnlockThresholds`)
 * replace wholesale — a fork that wants partial-array tuning rebuilds
 * the array explicitly.
 */
import { DEFAULT_SCALER_VARS } from './defaults';
import type { ScalerVars, ScalerVarsOverride } from './types';

export function loadScalerVars(...overrides: ScalerVarsOverride[]): ScalerVars {
  return overrides.reduce<ScalerVars>(
    (acc, override) => mergeScalerVars(acc, override),
    DEFAULT_SCALER_VARS,
  );
}

function mergeScalerVars(base: ScalerVars, override: ScalerVarsOverride): ScalerVars {
  return {
    archetype: { ...base.archetype, ...(override.archetype ?? {}) },
    theme: { ...base.theme, ...(override.theme ?? {}) },
    balance: mergeBalance(base.balance, override.balance),
  };
}

function mergeBalance(
  base: ScalerVars['balance'],
  override: ScalerVarsOverride['balance'],
): ScalerVars['balance'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    baseDimensionCost: {
      ...base.baseDimensionCost,
      ...(override.baseDimensionCost ?? {}),
    },
    prestigeConversions: override.prestigeConversions ?? base.prestigeConversions,
    softcapThresholds: override.softcapThresholds ?? base.softcapThresholds,
    layerUnlockThresholds: override.layerUnlockThresholds ?? base.layerUnlockThresholds,
  };
}
