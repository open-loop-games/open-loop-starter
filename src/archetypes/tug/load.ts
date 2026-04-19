/**
 * Tug archetype — vars loader.
 *
 * Deep-merges archetype → theme → balance in that load order. Callers pass
 * a game's three vars files (and optional test overrides) and get a
 * fully-resolved TugVars back.
 */
import { DEFAULT_TUG_VARS } from './defaults';
import type { TugVars, TugVarsOverride } from './types';

export function loadTugVars(...overrides: TugVarsOverride[]): TugVars {
  return overrides.reduce<TugVars>(
    (acc, override) => mergeTugVars(acc, override),
    DEFAULT_TUG_VARS,
  );
}

function mergeTugVars(base: TugVars, override: TugVarsOverride): TugVars {
  return {
    archetype: { ...base.archetype, ...(override.archetype ?? {}) },
    theme: mergeTheme(base.theme, override.theme),
    balance: mergeBalance(base.balance, override.balance),
  };
}

function mergeTheme(
  base: TugVars['theme'],
  override: TugVarsOverride['theme'],
): TugVars['theme'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    resourceName: { ...base.resourceName, ...(override.resourceName ?? {}) },
    abilityLabels: { ...base.abilityLabels, ...(override.abilityLabels ?? {}) },
    matchEndMessage: { ...base.matchEndMessage, ...(override.matchEndMessage ?? {}) },
  };
}

function mergeBalance(
  base: TugVars['balance'],
  override: TugVarsOverride['balance'],
): TugVars['balance'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    incomeUpgradeMultipliers: override.incomeUpgradeMultipliers ?? base.incomeUpgradeMultipliers,
    incomeUpgradeCosts: override.incomeUpgradeCosts ?? base.incomeUpgradeCosts,
    unitCosts: override.unitCosts ?? base.unitCosts,
    counterMatrix: override.counterMatrix ?? base.counterMatrix,
    abilityCosts: {
      ...(base.abilityCosts ?? {}),
      ...(override.abilityCosts ?? {}),
    },
    metaProgressionThresholds:
      override.metaProgressionThresholds ?? base.metaProgressionThresholds,
  };
}
