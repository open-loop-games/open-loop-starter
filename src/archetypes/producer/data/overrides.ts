import type {
  AchievementDef,
  ProducerBalance,
  ProducerData,
  ProducerDef,
  UpgradeDef,
} from './types';

/**
 * Flat-category override shape accepted by `createProducerEngine`.
 *
 * - `balance` deep-merges over `DEFAULT_PRODUCER_DATA.balance`.
 * - `producers`/`upgrades`/`achievements` replace entries by id; unknown
 *   ids throw so typos surface fast. To wholesale-replace a category, supply
 *   the full array (all existing ids plus any new ones) — same semantics as
 *   the data files themselves.
 */
export interface ProducerOverrides {
  producers?: Array<Partial<ProducerDef> & { id: string }>;
  upgrades?: Array<Partial<UpgradeDef> & { id: string }>;
  achievements?: Array<Partial<AchievementDef> & { id: string }>;
  balance?: Partial<ProducerBalance>;
}

export function applyProducerOverrides(
  base: ProducerData,
  overrides: ProducerOverrides | undefined,
): ProducerData {
  if (!overrides) return base;

  return {
    producers: mergeById(base.producers, overrides.producers, 'producers'),
    upgrades: mergeById(base.upgrades, overrides.upgrades, 'upgrades'),
    achievements: mergeById(base.achievements, overrides.achievements, 'achievements'),
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
