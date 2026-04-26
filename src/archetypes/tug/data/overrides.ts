import type {
  AbilityDef,
  CounterMatrix,
  FortressDef,
  IncomeUpgradeDef,
  TugBalance,
  TugData,
  TugTheme,
  UnitDef,
} from './types';

/**
 * Flat-category override shape accepted by `createTugEngine`.
 *
 * - `balance` and `theme` deep-merge over their defaults.
 * - `units` / `incomeUpgrades` / `abilities` replace entries by id; unknown
 *   ids throw so typos surface fast. Wholesale-replace by supplying the
 *   full array.
 * - `counterMatrix` wholesale-replaces (no id structure to merge by). Leaf 6
 *   perturbs counter sharpness via the `counter-matrix/strongCounter` and
 *   `counter-matrix/weakCounter` tunables at the resolver site, not through
 *   this override surface.
 *
 * Mirrors `applyAmbientOverrides` semantics.
 */
export interface TugOverrides {
  units?: Array<Partial<UnitDef> & { id: string }>;
  incomeUpgrades?: Array<Partial<IncomeUpgradeDef> & { id: string }>;
  abilities?: Array<Partial<AbilityDef> & { id: string }>;
  counterMatrix?: CounterMatrix;
  fortress?: Partial<FortressDef>;
  balance?: Partial<TugBalance>;
  theme?: Partial<TugTheme>;
}

export function applyTugOverrides(base: TugData, overrides: TugOverrides | undefined): TugData {
  if (!overrides) return base;
  return {
    units: mergeById(base.units, overrides.units, 'units'),
    incomeUpgrades: mergeById(base.incomeUpgrades, overrides.incomeUpgrades, 'incomeUpgrades'),
    abilities: mergeById(base.abilities, overrides.abilities, 'abilities'),
    counterMatrix: overrides.counterMatrix ?? base.counterMatrix,
    fortress: overrides.fortress ? { ...base.fortress, ...overrides.fortress } : base.fortress,
    balance: overrides.balance ? { ...base.balance, ...overrides.balance } : base.balance,
    theme: overrides.theme ? { ...base.theme, ...overrides.theme } : base.theme,
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
