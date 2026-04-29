import { useModule } from '@/composables/useModule';
import type { ProducerData } from '../data/types';
import { ProducerDataKey } from '../modules';

/**
 * Access the active producer data bag (defs + balance) — the same object the
 * engine modules closed over at construction. Use for data-layer introspection
 * (tooltip copy, gallery cards, workbench picker labels).
 */
export function useProducerData(): ProducerData {
  return useModule(ProducerDataKey);
}
