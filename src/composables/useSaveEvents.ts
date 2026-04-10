import type { SaveManager } from 'open-loop-engine';

/**
 * Placeholder until the engine re-exposes save lifecycle events. The old
 * `mgr.on('save:validation-error' | 'save:loaded' | ...)` API was removed;
 * the settings module still reports save success via `ctx.onSave`.
 */
export function useSaveEvents(_mgr: SaveManager): () => void {
  return () => {};
}
