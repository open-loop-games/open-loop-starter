/**
 * Explorer archetype — vars loader.
 *
 * Deep-merges archetype → theme → balance in that order. Mirrors the
 * looper / interlocker / producer / scaler loaders — kept deliberately
 * unabstracted so each archetype's merge semantics stay local. Nested
 * balance fields (`actionCosts`, `itemDropRates`) merge shallowly;
 * array fields (`zoneUnlockThresholds`, `bagCapacityUpgradeSteps`,
 * `bagCapacityUpgradeCosts`, `equipmentCraftingCosts`, and the
 * archetype-level `sectorsPerZone`) replace wholesale — a fork that
 * wants partial-array tuning rebuilds the array explicitly.
 */
import { DEFAULT_EXPLORER_VARS } from './defaults';
import type { ExplorerVars, ExplorerVarsOverride } from './types';

export function loadExplorerVars(...overrides: ExplorerVarsOverride[]): ExplorerVars {
  return overrides.reduce<ExplorerVars>(
    (acc, override) => mergeExplorerVars(acc, override),
    DEFAULT_EXPLORER_VARS,
  );
}

function mergeExplorerVars(
  base: ExplorerVars,
  override: ExplorerVarsOverride,
): ExplorerVars {
  return {
    archetype: { ...base.archetype, ...(override.archetype ?? {}) },
    theme: { ...base.theme, ...(override.theme ?? {}) },
    balance: mergeBalance(base.balance, override.balance),
  };
}

function mergeBalance(
  base: ExplorerVars['balance'],
  override: ExplorerVarsOverride['balance'],
): ExplorerVars['balance'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    actionCosts: {
      ...base.actionCosts,
      ...(override.actionCosts ?? {}),
    },
    itemDropRates: {
      ...base.itemDropRates,
      ...(override.itemDropRates ?? {}),
    },
    zoneUnlockThresholds: override.zoneUnlockThresholds ?? base.zoneUnlockThresholds,
    bagCapacityUpgradeSteps: override.bagCapacityUpgradeSteps ?? base.bagCapacityUpgradeSteps,
    bagCapacityUpgradeCosts: override.bagCapacityUpgradeCosts ?? base.bagCapacityUpgradeCosts,
    campConstructionCost: override.campConstructionCost ?? base.campConstructionCost,
    equipmentCraftingCosts: override.equipmentCraftingCosts ?? base.equipmentCraftingCosts,
  };
}
