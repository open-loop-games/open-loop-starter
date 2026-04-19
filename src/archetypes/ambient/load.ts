/**
 * Ambient archetype — vars loader.
 *
 * Deep-merges archetype → theme → balance in that load order. Callers pass
 * a game's three vars files (and optional test overrides) and get a
 * fully-resolved AmbientVars back.
 */
import { DEFAULT_AMBIENT_VARS } from './defaults';
import type { AmbientVars, AmbientVarsOverride } from './types';

export function loadAmbientVars(...overrides: AmbientVarsOverride[]): AmbientVars {
  return overrides.reduce<AmbientVars>(
    (acc, override) => mergeAmbientVars(acc, override),
    DEFAULT_AMBIENT_VARS,
  );
}

function mergeAmbientVars(base: AmbientVars, override: AmbientVarsOverride): AmbientVars {
  return {
    archetype: { ...base.archetype, ...(override.archetype ?? {}) },
    theme: { ...base.theme, ...(override.theme ?? {}) },
    balance: mergeBalance(base.balance, override.balance),
  };
}

function mergeBalance(
  base: AmbientVars['balance'],
  override: AmbientVarsOverride['balance'],
): AmbientVars['balance'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    producerCostScaling: {
      ...base.producerCostScaling,
      ...(override.producerCostScaling ?? {}),
    },
    tierCostRatios: override.tierCostRatios ?? base.tierCostRatios,
    unlockThresholds: override.unlockThresholds ?? base.unlockThresholds,
  };
}
