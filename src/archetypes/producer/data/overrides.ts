// ─── Overrides ───────────────────────────────────────────────────────────────
// Spec: archetypes/producer.md § 4 — Override semantics
// Role: Deep-partial perturbation surface over `ProducerData`. Sim tests
//       (`balance/`) and the workbench route through `createProducerEngine`
//       which calls `applyProducerOverrides(DEFAULT_PRODUCER_DATA, overrides)`
//       to land a fresh data bag the modules close over at install.
//
// Shape: flat-category, mirrors `ProducerData`. Producer / upgrade /
//        achievement overrides keyed by definition id; balance overrides
//        are a `Partial<ProducerBalance>` merge.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AchievementDef,
  ProducerBalance,
  ProducerData,
  ProducerDef,
  UpgradeDef,
} from './types';

export interface ProducerOverrides {
  producers?: Record<string, Partial<ProducerDef>>;
  upgrades?: Record<string, Partial<UpgradeDef>>;
  achievements?: Record<string, Partial<AchievementDef>>;
  balance?: Partial<ProducerBalance>;
}

function mergeById<T extends { id: string }>(
  base: T[],
  overrides: Record<string, Partial<T>> | undefined,
): T[] {
  if (!overrides) return base;
  return base.map((def) => {
    const patch = overrides[def.id];
    return patch ? { ...def, ...patch } : def;
  });
}

export function applyProducerOverrides(
  base: ProducerData,
  overrides?: ProducerOverrides,
): ProducerData {
  if (!overrides) return base;
  return {
    producers: mergeById(base.producers, overrides.producers),
    upgrades: mergeById(base.upgrades, overrides.upgrades),
    achievements: mergeById(base.achievements, overrides.achievements),
    balance: overrides.balance ? { ...base.balance, ...overrides.balance } : base.balance,
  };
}
