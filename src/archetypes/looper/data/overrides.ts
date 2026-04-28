import type { ActionDef, CapabilityDef, LooperBalance, LooperData, ZoneDef } from './types';

/**
 * Flat-category override shape accepted by `createLooperEngine`.
 *
 * - `balance` shallow-merges over `DEFAULT_LOOPER_DATA.balance`.
 * - `capabilities` / `zones` / `actions` replace entries by id; unknown ids
 *   throw so typos surface fast. To wholesale-replace a category, supply the
 *   full array (all existing ids plus any new ones).
 *
 * Mirrors `applyAmbientOverrides` / `applyProducerOverrides` semantics.
 */
export interface LooperOverrides {
  capabilities?: Array<Partial<CapabilityDef> & { id: string }>;
  zones?: Array<Partial<ZoneDef> & { id: string }>;
  actions?: Array<Partial<ActionDef> & { id: string }>;
  balance?: Partial<LooperBalance>;
}

export function applyLooperOverrides(
  base: LooperData,
  overrides: LooperOverrides | undefined,
): LooperData {
  if (!overrides) return base;
  return {
    capabilities: mergeById(base.capabilities, overrides.capabilities, 'capabilities'),
    zones: mergeById(base.zones, overrides.zones, 'zones'),
    actions: mergeById(base.actions, overrides.actions, 'actions'),
    balance: overrides.balance ? { ...base.balance, ...overrides.balance } : base.balance,
  };
}

function mergeById<T extends { id: string }>(
  base: T[],
  patches: Array<Partial<T> & { id: string }> | undefined,
  label: string,
): T[] {
  if (!patches || patches.length === 0) return base;
  const byId = new Map(base.map((entry) => [entry.id, entry] as const));
  const result = [...base];
  for (const patch of patches) {
    const existing = byId.get(patch.id);
    if (!existing) {
      throw new Error(`override for ${label}[id="${patch.id}"] does not match any base entry`);
    }
    const merged = { ...existing, ...patch } as T;
    const index = result.findIndex((e) => e.id === patch.id);
    result[index] = merged;
  }
  return result;
}
