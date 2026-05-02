import type {
  AchievementDef,
  AntimatterUpgradeDef,
  ChallengeDef,
  CrystalUpgradeDef,
  ProducerDef,
  ScalerBalance,
  ScalerData,
  TranscendUpgradeDef,
} from './types';

/**
 * Flat-category override shape accepted by `createScalerEngine`.
 *
 * - `balance` shallow-merges over `DEFAULT_SCALER_DATA.balance`.
 * - Per-tier patches replace entries by id; unknown ids throw so typos
 *   surface fast. To wholesale-replace a tier's category, supply the full
 *   array (all existing ids plus any new ones) — same semantics as the
 *   data files themselves. Mirrors `applyProducerOverrides` /
 *   `applyLooperOverrides`.
 */
export interface ScalerOverrides {
  antimatter?: {
    producers?: Array<Partial<ProducerDef> & { id: string }>;
    upgrades?: Array<Partial<AntimatterUpgradeDef> & { id: string }>;
  };
  prestige?: {
    producers?: Array<Partial<ProducerDef> & { id: string }>;
    crystalUpgrades?: Array<Partial<CrystalUpgradeDef> & { id: string }>;
  };
  transcend?: {
    producers?: Array<Partial<ProducerDef> & { id: string }>;
    upgrades?: Array<Partial<TranscendUpgradeDef> & { id: string }>;
    challenges?: Array<Partial<ChallengeDef> & { id: string }>;
  };
  achievements?: Array<Partial<AchievementDef> & { id: string }>;
  balance?: Partial<ScalerBalance>;
}

export function applyScalerOverrides(
  base: ScalerData,
  overrides: ScalerOverrides | undefined,
): ScalerData {
  if (!overrides) return base;

  return {
    antimatter: {
      producers: mergeById(
        base.antimatter.producers,
        overrides.antimatter?.producers,
        'antimatter.producers',
      ),
      upgrades: mergeById(
        base.antimatter.upgrades,
        overrides.antimatter?.upgrades,
        'antimatter.upgrades',
      ),
    },
    prestige: {
      producers: mergeById(
        base.prestige.producers,
        overrides.prestige?.producers,
        'prestige.producers',
      ),
      crystalUpgrades: mergeById(
        base.prestige.crystalUpgrades,
        overrides.prestige?.crystalUpgrades,
        'prestige.crystalUpgrades',
      ),
    },
    transcend: {
      producers: mergeById(
        base.transcend.producers,
        overrides.transcend?.producers,
        'transcend.producers',
      ),
      upgrades: mergeById(
        base.transcend.upgrades,
        overrides.transcend?.upgrades,
        'transcend.upgrades',
      ),
      challenges: mergeById(
        base.transcend.challenges,
        overrides.transcend?.challenges,
        'transcend.challenges',
      ),
    },
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
