import { inject } from 'vue';
import type { Engine } from 'open-loop-engine';
import type { LooperData } from '../data/types';
import { LooperDataKey } from '../modules';

/**
 * Access the active looper data bag (defs + balance) — the same object the
 * engine modules closed over at construction. Use for tooltip copy, action /
 * skill / zone lookups, workbench picker labels.
 */
export function useLooperData(): LooperData {
  const engine = inject<Engine>('engine');
  const data = engine?.tryInject(LooperDataKey);
  if (!data) {
    throw new Error('useLooperData() called outside an active looper engine');
  }
  return data;
}
