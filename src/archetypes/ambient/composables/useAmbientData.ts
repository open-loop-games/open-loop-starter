import { useModule } from '@/composables/useModule';
import type { AmbientData } from '../data/types';
import { AmbientDataKey } from '../modules';

/**
 * Access the active ambient data bag (defs + balance) — the same object the
 * engine modules closed over at construction. Use for data-layer introspection
 * (tooltip copy, scene-variant lookups, workbench picker labels).
 */
export function useAmbientData(): AmbientData {
  return useModule(AmbientDataKey);
}
