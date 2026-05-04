import type { ProducerBalance, ProducerData } from './types';

/**
 * Override shape accepted by `createProducerEngine`. `balance` deep-merges
 * over `DEFAULT_PRODUCER_DATA.balance`. Per-entry content overrides are not
 * supported — forks edit `data/*.ts` in place; live mods compose at module
 * install time via the engine's `ContentRegistry.patch` and `OverrideRegistry`.
 */
export interface ProducerOverrides {
  balance?: Partial<ProducerBalance>;
}

export function applyProducerOverrides(
  base: ProducerData,
  overrides: ProducerOverrides | undefined,
): ProducerData {
  if (!overrides?.balance) return base;
  return { ...base, balance: { ...base.balance, ...overrides.balance } };
}
