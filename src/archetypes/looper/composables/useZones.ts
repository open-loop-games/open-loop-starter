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
  /** Highest-ordered unlocked zone — defaults the picker on fresh load / loop reset. */
  highestUnlocked: ComputedRef<ZoneDef | null>;
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

  const highestUnlocked = computed<ZoneDef | null>(() => {
    const ordered = zones.ordered.value;
    for (let i = ordered.length - 1; i >= 0; i--) {
      const ordDef = ordered[i];
      if (zones.isUnlocked(ordDef.id)) {
        return data.zones.find((d) => d.id === ordDef.id) ?? null;
      }
    }
    return data.zones[0] ?? null;
  });

  return {
    rows,
    current,
    highestUnlocked,
    select: (zoneId) => {
      zones.select(zoneId);
    },
    isUnlocked: (zoneId) => zones.isUnlocked(zoneId),
  };
}
