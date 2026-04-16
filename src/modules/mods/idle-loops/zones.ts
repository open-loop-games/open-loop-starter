/**
 * Idle-loops mod — zone system setup.
 *
 * Two zones: Beginnersville (always unlocked) and Forest Path (Str-gated).
 * Zone unlock logic lives in the main module tick handler.
 */
import { createZoneSystem, type ZoneSystem } from 'open-loop-engine';
import type { ZoneDef } from './content';

export function createIdleLoopsZones(defs: ZoneDef[]): ZoneSystem {
  return createZoneSystem({
    id: 'il-zones',
    zones: defs,
    initiallyUnlocked: ['beginnersville'],
  });
}
