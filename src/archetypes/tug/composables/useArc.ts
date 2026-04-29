import { useModule } from '@/composables/useModule';
import { ArcKey, type ArcState } from '../modules';

/**
 * Beat-7 closure state — bimodal predicate already branched at install
 * time (meta-on: `factionsUnlocked > 0`; meta-off: `maxCounterPivotsAnyMatch
 * >= 3`). UI watches `announced` to fire the closure flavour toast.
 */
export function useArc(): ArcState {
  return useModule(ArcKey);
}
