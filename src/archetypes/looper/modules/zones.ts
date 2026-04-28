import {
  createZoneSystem,
  type EngineModule,
  type InjectionKey,
  type ZoneSystem,
} from 'open-loop-engine';
import type { LooperData } from '../data/types';

export const ZonesKey: InjectionKey<ZoneSystem> = Symbol(
  'looper/zones',
) as InjectionKey<ZoneSystem>;

const ZONES_CONTEXT_ID = 'looper/zones';

/**
 * Zones are UI grouping only in the canonical Looper shape — they do NOT
 * gate content. Per-action `prereqs` handle visibility (data/types.ts §
 * `ActionPrereq`); the cursor-walked queue is not zone-aware.
 *
 * Every zone boots `initiallyUnlocked` so the action drawer can populate
 * tabs from registration order without waiting on threshold-crossing
 * watchers. Forks that want zone-level unlocks layer extra prereqs onto each
 * zone's entry actions; this module does not revive a `requires` field.
 *
 * The engine's `createZoneSystem` is retained for its `current.value` /
 * `select(id)` semantics (action drawer tab focus tracking) and for the
 * `ordered` ranking by registration order. The unlocked-set side of the
 * ZoneSystem is effectively always-full here.
 */
export function createZonesModule(data: LooperData): EngineModule {
  return {
    id: 'looper/zones',
    install(ctx) {
      const zones = createZoneSystem({
        id: ZONES_CONTEXT_ID,
        zones: data.zones.map((z, index) => ({
          id: z.id,
          name: z.name,
          order: index,
        })),
        initiallyUnlocked: data.zones.map((z) => z.id),
      });

      ctx.provide(ZonesKey, zones);
    },
  };
}
