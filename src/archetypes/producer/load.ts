/**
 * Producer archetype — vars loader.
 *
 * Deep-merges archetype → theme → balance in that load order. Callers pass
 * a game's three vars files (and optional test overrides) and get a
 * fully-resolved ProducerVars back.
 *
 * Deliberately a single function rather than a framework. Games that need
 * richer merge semantics (per-field precedence, environment overlays) fork
 * this file rather than growing it.
 */
import { DEFAULT_PRODUCER_VARS } from './defaults';
import type { ProducerVars, ProducerVarsOverride } from './types';

export function loadProducerVars(...overrides: ProducerVarsOverride[]): ProducerVars {
  return overrides.reduce<ProducerVars>(
    (acc, override) => mergeProducerVars(acc, override),
    DEFAULT_PRODUCER_VARS,
  );
}

function mergeProducerVars(base: ProducerVars, override: ProducerVarsOverride): ProducerVars {
  return {
    archetype: { ...base.archetype, ...(override.archetype ?? {}) },
    theme: { ...base.theme, ...(override.theme ?? {}) },
    balance: mergeBalance(base.balance, override.balance),
  };
}

function mergeBalance(
  base: ProducerVars['balance'],
  override: ProducerVarsOverride['balance'],
): ProducerVars['balance'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    producerCostScaling: {
      ...base.producerCostScaling,
      ...(override.producerCostScaling ?? {}),
    },
    tierCostRatios: override.tierCostRatios ?? base.tierCostRatios,
    milestoneThresholds: override.milestoneThresholds ?? base.milestoneThresholds,
  };
}
