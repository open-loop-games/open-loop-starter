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
 * UI surface for the autobuyer registry. Producer is single-category, so
 * `rows` is a flat list rather than a per-tier accessor (cf. scaler's
 * `byTier`); rows still carry `groupId` (`'producers'` / `'upgrades'`) so
 * forks that introduce per-group panels can filter without restructuring.
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
