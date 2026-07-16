import { computed, unref, type ComputedRef, type Ref } from 'vue';
import { processGetter } from '@open-loop/engine';
import { useModule } from '@/composables/useModule';
import { AutobuyerMasterToggleKey, AutobuyerRegistryKey, type AutobuyerSpec } from '../modules';

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
  rows: ComputedRef<AutobuyerRow[]>;
}

/**
 * UI surface for the autobuyer registry. Ambient ships a single registered
 * spec (producer auto-buy); visibility unlocks fire unconditionally and are
 * not part of the registry.
 */
export function useAutobuyers(): AutobuyerSurface {
  const master = useModule(AutobuyerMasterToggleKey);
  const registry = useModule(AutobuyerRegistryKey);

  function rowFor(spec: AutobuyerSpec): AutobuyerRow {
    const processed = processGetter(spec.isUnlocked);
    const isUnlocked = computed(() => Boolean(unref(processed)));
    return {
      id: spec.id,
      groupId: spec.groupId,
      displayName: spec.displayName,
      isActive: spec.isActive,
      isUnlocked,
      spec,
    };
  }

  const rows = computed(() => registry.map(rowFor));

  return { master, rows };
}
