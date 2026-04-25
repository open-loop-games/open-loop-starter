import { inject } from 'vue';
import type { Engine } from 'open-loop-engine';
import type { AmbientData } from '../data/types';
import { AmbientDataKey } from '../modules';

/**
 * Access the active ambient data bag (defs + balance) — the same object the
 * engine modules closed over at construction. Use for data-layer introspection
 * (tooltip copy, scene-variant lookups, workbench picker labels).
 */
export function useAmbientData(): AmbientData {
  const engine = inject<Engine>('engine');
  const data = engine?.tryInject(AmbientDataKey);
  if (!data) {
    throw new Error('useAmbientData() called outside an active ambient engine');
  }
  return data;
}
