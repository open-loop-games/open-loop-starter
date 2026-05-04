import type { ScalerBalance, ScalerData } from './types';

/**
 * Override shape accepted by `createScalerEngine`. `balance` shallow-merges
 * over `DEFAULT_SCALER_DATA.balance`. Per-entry content overrides are not
 * supported — forks edit `data/*.ts` in place; live mods compose at module
 * install time via the engine's `ContentRegistry.patch` and `OverrideRegistry`.
 */
export interface ScalerOverrides {
  balance?: Partial<ScalerBalance>;
}

export function applyScalerOverrides(
  base: ScalerData,
  overrides: ScalerOverrides | undefined,
): ScalerData {
  if (!overrides?.balance) return base;
  return { ...base, balance: { ...base.balance, ...overrides.balance } };
}
