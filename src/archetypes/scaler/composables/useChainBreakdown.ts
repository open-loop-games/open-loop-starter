import { computed, unref } from 'vue';
import type { ComputedRef } from 'vue';
import type { ModifierChain } from 'open-loop-engine';

// TODO(expansion): near-identical to producer/composables/useChainBreakdown.ts.
// Graduate to src/composables/ when a third archetype lands its own copy.

export interface ChainFactor {
  id: string;
  text: string;
  formattedValue: string;
  active: boolean;
  isBad: boolean;
}

export interface ChainBreakdown {
  factors: ChainFactor[];
  activeCount: number;
}

/**
 * Walk a chain's bindings and surface them as UI-renderable factors. Active
 * bindings sort before inactive ones; within each group insertion order is
 * preserved so related bindings (per-tier upgrades, per-challenge stacks)
 * stay grouped.
 */
export function useChainBreakdown(chain: ModifierChain): ComputedRef<ChainBreakdown> {
  return computed(() => {
    const factors: ChainFactor[] = [];
    let activeCount = 0;
    for (const binding of chain.bindings()) {
      const desc = binding.modifier.description;
      if (!desc) continue;
      const resolved = typeof desc === 'function' ? desc() : desc;
      const active =
        (binding.active == null ? true : (unref(binding.active) ?? false)) &&
        (binding.modifier.enabled == null ? true : (unref(binding.modifier.enabled) ?? false));
      if (active) activeCount += 1;
      factors.push({
        id: binding.id,
        text: resolved.text,
        formattedValue: resolved.formattedValue,
        active,
        isBad: resolved.isBad ?? false,
      });
    }
    factors.sort((a, b) => Number(b.active) - Number(a.active));
    return { factors, activeCount };
  });
}
