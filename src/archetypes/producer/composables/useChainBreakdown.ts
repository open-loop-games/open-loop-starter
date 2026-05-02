import { computed, unref } from 'vue';
import type { ComputedRef } from 'vue';
import type { ModifierChain } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { BuildingsKey } from '../modules';

export interface ChainFactor {
  /** Stable id of the binding — auto-derived from scope + description. */
  id: string;
  /** Primary label ("Golden Whisk", "First Crumb"). */
  text: string;
  /** Operation + value ("×2", "×1.02"). */
  formattedValue: string;
  /** Whether the factor is currently contributing (active + modifier enabled). */
  active: boolean;
  /** Detrimental contribution — consumers may highlight in red. */
  isBad: boolean;
}

export interface ChainBreakdown {
  factors: ChainFactor[];
  activeCount: number;
}

/**
 * Walk a chain's bindings and surface them as UI-renderable factors. Active
 * bindings sort before inactive ones so the eye reads the stacked multipliers
 * first; within each group insertion order is preserved so related bindings
 * (upgrades per producer, milestones in threshold order) stay grouped.
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

/**
 * Shorthand: inspect the chain attached to the producer with the given id.
 * Throws if the producer isn't registered — the id list is static, so a
 * missing entry is a setup error, not runtime data.
 */
export function useProducerChainBreakdown(producerId: string): ComputedRef<ChainBreakdown> {
  const buildings = useModule(BuildingsKey);
  const producer = buildings.getProducer(producerId);
  if (!producer) {
    throw new Error(`useProducerChainBreakdown: no producer "${producerId}"`);
  }
  return useChainBreakdown(producer.rateChain);
}
