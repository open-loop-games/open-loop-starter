import type { IncomeUpgradeDef, TugBalance, TugBelievability, TugData, UnitDef } from './types';

/** Override shape for the believability sub-bundle — partial so callers
 *  can override one knob without restating both. The applyTugOverrides
 *  sub-merge fills missing fields from the base. */
export type TugBalanceOverrides = Partial<Omit<TugBalance, 'believability'>> & {
  believability?: Partial<TugBelievability>;
};

/**
 * Override shape accepted by `createTugEngine`. `balance` shallow-merges
 * over `DEFAULT_TUG_DATA.balance`, with a sub-merge for `believability`.
 *
 * `units` and `incomeUpgrades` are id-keyed partials used by balance probes
 * (cost/multiplier sensitivity sweeps). Unknown ids throw so typos surface
 * fast. Other content categories (abilities, counterMatrix, fortress, theme)
 * are not overridable here — forks edit `data/*.ts` in place; live mods
 * compose at module install time via `ContentRegistry.patch`.
 */
export interface TugOverrides {
  balance?: TugBalanceOverrides;
  units?: Array<Partial<UnitDef> & { id: string }>;
  incomeUpgrades?: Array<Partial<IncomeUpgradeDef> & { id: string }>;
}

export function applyTugOverrides(base: TugData, overrides: TugOverrides | undefined): TugData {
  if (!overrides) return base;
  let result: TugData = base;
  if (overrides.balance) {
    const { believability: bOverride, ...rest } = overrides.balance;
    let balance: TugBalance = { ...base.balance, ...rest };
    if (bOverride) {
      balance = {
        ...balance,
        believability: { ...base.balance.believability, ...bOverride },
      };
    }
    result = { ...result, balance };
  }
  if (overrides.units) {
    result = { ...result, units: mergeById(result.units, overrides.units, 'units') };
  }
  if (overrides.incomeUpgrades) {
    result = {
      ...result,
      incomeUpgrades: mergeById(result.incomeUpgrades, overrides.incomeUpgrades, 'incomeUpgrades'),
    };
  }
  return result;
}

function mergeById<T extends { id: string }>(
  base: T[],
  patches: Array<Partial<T> & { id: string }>,
  label: string,
): T[] {
  if (patches.length === 0) return base;
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
