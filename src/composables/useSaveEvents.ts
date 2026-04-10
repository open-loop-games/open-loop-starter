import type { SaveManager } from 'open-loop-engine';
import { useToasts } from './useToasts';

/**
 * Subscribe a SaveManager's lifecycle events to the toast system and console.
 * Validation-error events are buffered per-load and surfaced as a single
 * aggregated toast on success, to avoid spamming one toast per healed field.
 *
 * Call once after `createEngine`, before the first `engine.load()`. Returns
 * an unsubscribe function that tears down all listeners.
 */
export function useSaveEvents(mgr: SaveManager): () => void {
  const { addToast } = useToasts();

  let pendingHealed = 0;
  let pendingFailed = 0;

  const unsubs = [
    mgr.on('save:validation-error', (issue) => {
      if (issue.action === 'self-heal') pendingHealed++;
      else pendingFailed++;
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
      pendingFailed = 0;
    }),

    mgr.on('save:load-failed', (err) => {
      const msg = describeFailure(err.reason);
      addToast('Save load failed', msg, false);
      console.error('[save] load failed:', err.reason, err.detail);
      pendingHealed = 0;
      pendingFailed = 0;
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
