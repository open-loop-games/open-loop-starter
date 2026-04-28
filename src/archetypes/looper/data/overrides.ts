import type {
  ActionDef,
  CapabilityDef,
  LooperBalance,
  LooperData,
  ProgressVarDef,
  RegularVarDef,
  ZoneDef,
} from './types';

/**
 * Action override partial — `Partial<ActionDef> & { id: string }` distributed
 * across the discriminated union, with `type` optional. The merge function
 * preserves the existing entry's `type` when the patch omits it; if the patch
 * provides a `type` that differs from base, it throws (caller mistake).
 *
 * Per-variant partials with required discriminant were considered — they
 * narrow TS field access per-type — but the ergonomic tax (every override
 * call site must restate `type`) outweighed the narrowing benefit for the
 * small action-tuning surface this is used for. Forks needing per-variant
 * field discipline can swap the type alias locally.
 */
export type ActionOverride =
  | (Partial<Extract<ActionDef, { type: 'progress' }>> & { id: string })
  | (Partial<Extract<ActionDef, { type: 'regular' }>> & { id: string })
  | (Partial<Extract<ActionDef, { type: 'basic' }>> & { id: string });

/**
 * Flat-category override shape accepted by `createLooperEngine`.
 *
 * - `balance` shallow-merges over `DEFAULT_LOOPER_DATA.balance`.
 * - `capabilities` / `zones` / `progressVars` / `regularVars` / `actions`
 *   replace entries by id; unknown ids throw so typos surface fast. To
 *   wholesale-replace a category, supply the full array (all existing ids
 *   plus any new ones).
 *
 * Mirrors `applyAmbientOverrides` / `applyProducerOverrides` semantics.
 */
export interface LooperOverrides {
  capabilities?: Array<Partial<CapabilityDef> & { id: string }>;
  zones?: Array<Partial<ZoneDef> & { id: string }>;
  progressVars?: Array<Partial<ProgressVarDef> & { id: string }>;
  regularVars?: Array<Partial<RegularVarDef> & { id: string }>;
  actions?: ActionOverride[];
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
    progressVars: mergeById(base.progressVars, overrides.progressVars, 'progressVars'),
    regularVars: mergeById(base.regularVars, overrides.regularVars, 'regularVars'),
    actions: mergeActions(base.actions, overrides.actions),
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

/**
 * Action overrides need the per-variant partial form — we can't reuse
 * `mergeById` because the discriminant must match the existing entry's type.
 * Mismatched `type` between patch and base throws.
 */
function mergeActions(base: ActionDef[], patches: ActionOverride[] | undefined): ActionDef[] {
  if (!patches || patches.length === 0) return base;
  const byId = new Map(base.map((entry) => [entry.id, entry] as const));
  const result = [...base];
  for (const patch of patches) {
    const existing = byId.get(patch.id);
    if (!existing) {
      throw new Error(`override for actions[id="${patch.id}"] does not match any base entry`);
    }
    // `type` is optional in the patch — when omitted, the merge preserves
    // existing.type. When provided, it must match base; mismatch is caller error.
    const patchType = (patch as { type?: ActionDef['type'] }).type;
    if (patchType !== undefined && patchType !== existing.type) {
      throw new Error(
        `override for actions[id="${patch.id}"] type mismatch: base="${existing.type}" patch="${patchType}"`,
      );
    }
    const merged = { ...existing, ...patch } as ActionDef;
    const index = result.findIndex((e) => e.id === patch.id);
    result[index] = merged;
  }
  return result;
}
