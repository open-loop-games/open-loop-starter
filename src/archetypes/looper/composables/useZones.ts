import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { useModule } from '@/composables/useModule';
import type { ZoneDef } from '../data/types';
import { useLooperData } from './useLooperData';
import { ZonesKey } from '../modules';

export interface ZoneRow {
  def: ZoneDef;
  unlocked: ComputedRef<boolean>;
}

export interface ZonesView {
  rows: ComputedRef<ZoneRow[]>;
  /** Currently selected zone id (drives the action drawer's tab focus). */
  current: ComputedRef<string>;
  /** First zone in registration order — the boot default. */
  defaultZone: ComputedRef<ZoneDef | null>;
  select(zoneId: string): void;
  isUnlocked(zoneId: string): boolean;
}

export function useZones(): ZonesView {
  const zones = useModule(ZonesKey);
  const data = useLooperData();

  const rows = computed<ZoneRow[]>(() =>
    data.zones.map((def) => ({
      def,
      unlocked: computed(() => zones.isUnlocked(def.id)),
    })),
  );

  const current = computed(() => zones.current.value);

  // Boot default. Zones don't gate content in the canonical Looper shape
  // (per-action `prereqs` handle gating; `ZoneDef.requires` is dropped), so
  // every zone reports `isUnlocked === true`. The pre-reground "highest
  // unlocked" auto-snap heuristic produced the wrong UX (drawer opening on
  // Wilds at boot); progressive disclosure now lives in the per-action
  // visibility filter, not zone selection.
  const defaultZone = computed<ZoneDef | null>(() => data.zones[0] ?? null);

  return {
    rows,
    current,
    defaultZone,
    select: (zoneId) => {
      zones.select(zoneId);
    },
    isUnlocked: (zoneId) => zones.isUnlocked(zoneId),
  };
}
