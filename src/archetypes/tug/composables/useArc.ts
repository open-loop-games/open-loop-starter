import { inject } from 'vue';
import type { Engine } from 'open-loop-engine';
import { ArcKey, type ArcState } from '../modules';

/**
 * Beat-7 closure state — bimodal predicate already branched at install
 * time (meta-on: `factionsUnlocked > 0`; meta-off: `maxCounterPivotsAnyMatch
 * >= 3`). UI watches `announced` to fire the closure flavour toast.
 */
export function useArc(): ArcState {
  const engine = inject<Engine>('engine');
  const arc = engine?.tryInject(ArcKey);
  if (!arc) {
    throw new Error('useArc() called outside an active tug engine');
  }
  return arc;
}
