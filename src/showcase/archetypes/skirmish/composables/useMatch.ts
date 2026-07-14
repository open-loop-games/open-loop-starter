import { ref, onScopeDispose, type Ref } from 'vue';
import { useModule } from '@/composables/useModule';
import { MatchKey, type MatchApi, type MatchEndedPayload } from '../modules';

export interface MatchView extends MatchApi {
  /**
   * Latched payload of the most recent `matchEnded`. UI source of truth for
   * the match-end summary — `outcome` flips back to null when `end()` runs the
   * reset, so reading the live ref post-event would miss it. Captured BEFORE
   * the reset (per the match contract); stays until `clearLastMatchEnd()`.
   */
  lastMatchEnd: Ref<MatchEndedPayload | null>;
  clearLastMatchEnd(): void;
}

export function useMatch(): MatchView {
  const match = useModule(MatchKey);

  const lastMatchEnd = ref<MatchEndedPayload | null>(null);
  const unsubscribe = match.on('matchEnded', (payload) => {
    lastMatchEnd.value = payload;
  });
  onScopeDispose(() => unsubscribe());

  return {
    ...match,
    lastMatchEnd,
    clearLastMatchEnd: () => {
      lastMatchEnd.value = null;
    },
  };
}
