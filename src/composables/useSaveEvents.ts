import type { SaveManager } from '@open-loop/engine';
import { useToasts } from './useToasts';

/**
 * Subscribe a SaveManager's lifecycle events to the toast system and console.
 *
 * Validation-error events are buffered per-load and shown as a single
 * aggregated toast on success (avoids one-toast-per-healed-field spam).
 * Load failures, future-version refusals, and save migrations show with
 * human-readable reasons. A failed load that protects its slot says so on the
 * same toast: saves to that slot stop until the player deletes the save.
 *
 * Wired automatically by `bootApp`, so every game booted through it inherits
 * the pattern. Returns an unsubscribe function that removes every handler;
 * `bootApp` doesn't call it, because the handlers last as long as the engine.
 * A host that unmounts a game and keeps the page calls it.
 */
export function useSaveEvents(mgr: SaveManager): () => void {
  const { toasts, addToast } = useToasts();

  let pendingHealed = 0;
  // The toast the last failed load raised. The save manager protects the slot
  // right after reporting the failure, and that note joins this toast.
  let failedLoad: { slotId: number; toastId: number } | null = null;
  // The engine refuses a future-version save on its own event, then reports
  // the same failure on `save:load-failed`; one toast covers both.
  let refusedToastId: number | null = null;

  const unsubs = [
    mgr.on('save:validation-failed', (issue) => {
      if (issue.action === 'self-heal') pendingHealed++;
      console.warn(
        `[save] validation ${issue.action} at ${issue.path}: expected ${issue.expected}`,
        issue.received,
      );
    }),

    mgr.on('save:loaded', () => {
      if (pendingHealed > 0) {
        addToast(
          'Save auto-repaired',
          `${pendingHealed} field${pendingHealed === 1 ? '' : 's'} reset to default — see console for details.`,
          8000,
        );
      }
      pendingHealed = 0;
    }),

    mgr.on('save:load-failed', (err) => {
      // An empty slot is the first thing every new player and every fresh fork
      // hits, and it is not a failure — toasting it as an undismissable error
      // put "Save load failed" on the screen behind the opening moment of the
      // game. Still logged, because a slot that is unexpectedly empty is worth
      // finding in the console.
      if (err.reason === 'not-found') {
        console.info('[save] no save in slot — starting fresh');
        pendingHealed = 0;
        return;
      }
      const refused = err.reason === 'future-version' ? refusedToastId : null;
      refusedToastId = null;
      const toastId = refused ?? addToast('Save load failed', describeFailure(err.reason), false);
      failedLoad = { slotId: err.slotId, toastId };
      console.error('[save] load failed:', err.reason, err.detail);
      pendingHealed = 0;
    }),

    mgr.on('save:slot-protected', ({ slotId }) => {
      const failure = failedLoad?.slotId === slotId ? failedLoad : null;
      const toast = failure && toasts.value.find((t) => t.id === failure.toastId);
      if (toast) toast.content += ` ${PROTECTED_NOTE}`;
      else addToast('Saving paused', PROTECTED_NOTE, false);
      failedLoad = null;
      console.warn(`[save] slot ${slotId} protected — saves skip it until the save is deleted`);
    }),

    mgr.on('save:future-version-refused', (err) => {
      refusedToastId = addToast(
        'Save from a newer build',
        `This save has save version ${err.writtenVersion}; this build loads up to save version ${err.supportedVersion}. Refusing to load to avoid corruption.`,
        false,
      );
      console.error('[save] future-version refused:', err);
    }),

    mgr.on('save:migration-applied', (info) => {
      console.info(`[save] save migration: v${info.from} → v${info.to}`);
    }),
  ];

  return () => unsubs.forEach((u) => u());
}

const PROTECTED_NOTE =
  'Saving to this slot is paused so it keeps the save that failed. Delete the save to start the slot over.';

function describeFailure(reason: string): string {
  switch (reason) {
    case 'validation':
      return 'Strict validation found unrecoverable issues. Check console for save paths.';
    case 'parse-error':
      return 'The save text is malformed or corrupted.';
    case 'wrong-game-id':
      return 'This save belongs to a different game.';
    case 'wrong-mod':
      return 'This save belongs to a different mod.';
    case 'not-found':
      return 'No save found in this slot.';
    default:
      return `Unknown error (${reason}). Check console for details.`;
  }
}
