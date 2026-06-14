import { ref, onScopeDispose, type Ref } from 'vue';
import { useModule } from '@/composables/useModule';
import { MatchKey, type MatchApi, type MatchEndedPayload } from '../modules';

export interface MatchView extends MatchApi {
  /**
   * Latched payload of the most recent `'matchEnded'` event. UI source of
   * truth for the match-end overlay — `outcome` flips back to null when
   * `match.end()` runs the reset, so reading the live ref post-event would
   * miss the summary state. The payload is captured BEFORE the reset (per
   * leaf-4 contract) and stays here until `clearLastMatchEnd()` is called
   * from the restart handler.
   */
  lastMatchEnd: Ref<MatchEndedPayload | null>;
  clearLastMatchEnd(): void;
}

/**
 * Match orchestrator view + the latched last-match-end payload. Exposing the
 * latch composable-side keeps `MatchEndSummary.vue` declarative — it reads
 * `useMatch().lastMatchEnd.value` and renders / hides on null.
 */
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
