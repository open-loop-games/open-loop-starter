import { inject } from 'vue';
import type { Engine } from 'open-loop-engine';
import type { ProducerData } from '../data/types';
import { ProducerDataKey } from '../modules';

/**
 * Access the active producer data bag (defs + balance) — the same object the
 * engine modules closed over at construction. Use for data-layer introspection
 * (tooltip copy, gallery cards, workbench picker labels).
 */
export function useProducerData(): ProducerData {
  const engine = inject<Engine>('engine');
  const data = engine?.tryInject(ProducerDataKey);
  if (!data) {
    throw new Error('useProducerData() called outside an active producer engine');
  }
  return data;
}
