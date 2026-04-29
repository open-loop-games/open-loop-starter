import { useModule } from '@/composables/useModule';
import type { TugData } from '../data/types';
import { TugDataKey } from '../modules';

/**
 * Access the active Tug data bag (units, counter matrix, balance, theme) —
 * the same object the engine modules closed over at construction. Use for
 * data-layer introspection (tooltip copy, counter-matrix lookups, theme
 * labels, workbench picker labels).
 */
export function useTugData(): TugData {
  return useModule(TugDataKey);
}
