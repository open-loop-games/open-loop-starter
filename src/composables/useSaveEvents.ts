import type { SaveManager } from '@open-loop/engine';
import { useToasts } from './useToasts';

/**
 * Subscribe a SaveManager's lifecycle events to the toast system and console.
 *
 * Validation-error events are buffered per-load and surfaced as a single
 * aggregated toast on success (avoids one-toast-per-healed-field spam).
 * Load failures, future-version refusals, and migration steps surface with
 * human-readable reasons.
 *
 * Wired automatically by `bootApp` so every starter-using demo + every fork
 * inherits the pattern. Returns an unsubscribe function that tears down all
 * listeners; `bootApp` doesn't currently call it (listeners live as long as
 * the engine), but the gallery sandbox could on unmount.
 */
export function useSaveEvents(mgr: SaveManager): () => void {
  const { addToast } = useToasts();

  let pendingHealed = 0;

  const unsubs = [
    mgr.on('save:validation-error', (issue) => {
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
      addToast('Save load failed', describeFailure(err.reason), false);
      console.error('[save] load failed:', err.reason, err.detail);
      pendingHealed = 0;
    }),

    mgr.on('save:future-version', (err) => {
      addToast(
        'Save from newer version',
        `This save was written by version ${err.saveVersion}; the current build only supports up to version ${err.currentVersion}. Refusing to load to avoid corruption.`,
        false,
      );
      console.error('[save] future-version refused:', err);
    }),

    mgr.on('save:migration-step', (info) => {
      console.info(`[save] migrated v${info.from} → v${info.to}`);
    }),
  ];

  return () => unsubs.forEach((u) => u());
}

function describeFailure(reason: string): string {
  switch (reason) {
    case 'validation':
      return 'Strict validation found unrecoverable issues. Check console for field paths.';
    case 'parse-error':
      return 'Save data is malformed or corrupted.';
    case 'wrong-game-id':
      return 'This save belongs to a different game.';
    case 'not-found':
      return 'No save found in this slot.';
    default:
      return `Unknown error (${reason}). Check console for details.`;
  }
}
