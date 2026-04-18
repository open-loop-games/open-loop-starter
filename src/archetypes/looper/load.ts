/**
 * Looper archetype — vars loader.
 *
 * Deep-merges archetype → theme → balance in that order. Mirrors the
 * producer loader — kept deliberately unabstracted so each archetype's
 * merge semantics stay local.
 */
import { DEFAULT_LOOPER_VARS } from './defaults';
import type { LooperVars, LooperVarsOverride } from './types';

export function loadLooperVars(...overrides: LooperVarsOverride[]): LooperVars {
  return overrides.reduce<LooperVars>(
    (acc, override) => mergeLooperVars(acc, override),
    DEFAULT_LOOPER_VARS,
  );
}

function mergeLooperVars(base: LooperVars, override: LooperVarsOverride): LooperVars {
  return {
    archetype: { ...base.archetype, ...(override.archetype ?? {}) },
    theme: { ...base.theme, ...(override.theme ?? {}) },
    balance: mergeBalance(base.balance, override.balance),
  };
}

function mergeBalance(
  base: LooperVars['balance'],
  override: LooperVarsOverride['balance'],
): LooperVars['balance'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    actionCostScaling: {
      ...base.actionCostScaling,
      ...(override.actionCostScaling ?? {}),
    },
    skillLeveling: {
      ...base.skillLeveling,
      ...(override.skillLeveling ?? {}),
    },
    retentionCurve: {
      ...base.retentionCurve,
      ...(override.retentionCurve ?? {}),
    },
    zoneUnlockThresholds: override.zoneUnlockThresholds ?? base.zoneUnlockThresholds,
  };
}
