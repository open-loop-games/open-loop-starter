import { computed, type ComputedRef, type Ref } from 'vue';
import { useModule } from '@/composables/useModule';
import { AutobuyerMasterToggleKey, AutobuyerRegistryKey, type AutobuyerSpec } from '../modules';
import type { Tier } from '../data/types';

export interface AutobuyerRow {
  id: string;
  groupId: string | undefined;
  displayName: string;
  isActive: Ref<boolean>;
  isUnlocked: ComputedRef<boolean>;
  spec: AutobuyerSpec;
}

export interface AutobuyerSurface {
  master: Ref<boolean>;
  byTier: (tier: Tier) => ComputedRef<AutobuyerRow[]>;
}

/**
 * UI surface for the autobuyer registry. Wraps each spec's `isUnlocked`
 * computable in a `ComputedRef<boolean>` so templates can render the
 * unlock gate reactively, and partitions the registry by `groupId` (which
 * mirrors the scaler tier id).
 */
export function useAutobuyers(): AutobuyerSurface {
  const master = useModule(AutobuyerMasterToggleKey);
  const registry = useModule(AutobuyerRegistryKey);

  function rowFor(spec: AutobuyerSpec): AutobuyerRow {
    const unlocked = spec.isUnlocked;
    const isUnlocked = computed(() => {
      if (typeof unlocked === 'function') return Boolean(unlocked());
      if (unlocked && typeof unlocked === 'object' && 'value' in unlocked) {
        return Boolean((unlocked as { value: unknown }).value);
      }
      return Boolean(unlocked);
    });
    return {
      id: spec.id,
      groupId: spec.groupId,
      displayName: spec.displayName,
      isActive: spec.isActive,
      isUnlocked,
      spec,
    };
  }

  function byTier(tier: Tier): ComputedRef<AutobuyerRow[]> {
    return computed(() => registry.filter((spec) => spec.groupId === tier).map(rowFor));
  }

  return { master, byTier };
}
