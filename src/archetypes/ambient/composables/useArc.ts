import { useModule } from '@/composables/useModule';
import { ArcKey, type ArcState } from '../modules';

export function useArc(): ArcState {
  return useModule(ArcKey);
}
