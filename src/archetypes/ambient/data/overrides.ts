import type { AmbientBalance, AmbientData } from './types';

/**
 * Override shape accepted by `createAmbientEngine`. `balance` deep-merges
 * over `DEFAULT_AMBIENT_DATA.balance`. Per-entry content overrides are not
 * supported — forks edit `data/*.ts` in place; live mods compose at module
 * install time via the engine's `ContentRegistry.patch` and `OverrideRegistry`.
 */
export interface AmbientOverrides {
  balance?: Partial<AmbientBalance>;
}

export function applyAmbientOverrides(
  base: AmbientData,
  overrides: AmbientOverrides | undefined,
): AmbientData {
  if (!overrides?.balance) return base;
  return { ...base, balance: { ...base.balance, ...overrides.balance } };
}
