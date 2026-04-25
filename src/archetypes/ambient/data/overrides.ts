import type {
  AchievementDef,
  AmbientBalance,
  AmbientData,
  AutoProducerDef,
  SceneVariantDef,
  UnlockDef,
} from './types';

/**
 * Flat-category override shape accepted by `createAmbientEngine`.
 *
 * - `balance` deep-merges over `DEFAULT_AMBIENT_DATA.balance`.
 * - `producers` / `unlocks` / `achievements` / `sceneVariants` replace
 *   entries by id; unknown ids throw so typos surface fast. To wholesale-
 *   replace a category, supply the full array (all existing ids plus any
 *   new ones).
 *
 * Mirrors `applyProducerOverrides` semantics.
 */
export interface AmbientOverrides {
  producers?: Array<Partial<AutoProducerDef> & { id: string }>;
  unlocks?: Array<Partial<UnlockDef> & { id: string }>;
  achievements?: Array<Partial<AchievementDef> & { id: string }>;
  sceneVariants?: Array<Partial<SceneVariantDef> & { id: string }>;
  balance?: Partial<AmbientBalance>;
}

export function applyAmbientOverrides(
  base: AmbientData,
  overrides: AmbientOverrides | undefined,
): AmbientData {
  if (!overrides) return base;
  return {
    producers: mergeById(base.producers, overrides.producers, 'producers'),
    unlocks: mergeById(base.unlocks, overrides.unlocks, 'unlocks'),
    achievements: mergeById(base.achievements, overrides.achievements, 'achievements'),
    sceneVariants: mergeById(base.sceneVariants, overrides.sceneVariants, 'sceneVariants'),
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
