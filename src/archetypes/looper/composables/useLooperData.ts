import { useModule } from '@/composables/useModule';
import type { LooperData } from '../data/types';
import { LooperDataKey } from '../modules';

/**
 * Access the active looper data bag (defs + balance) — the same object the
 * engine modules closed over at construction. Use for tooltip copy, action /
 * skill / zone lookups, workbench picker labels.
 */
export function useLooperData(): LooperData {
  return useModule(LooperDataKey);
}
