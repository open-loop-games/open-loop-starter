import { onScopeDispose } from 'vue';
import { useGame } from './useGame';

export interface DevHandleOptions {
  /** Seconds per advance in `skip()`. Default: 1. */
  chunk?: number;
  /** Runs after every chunk of `skip()`: the story's reference player. */
  step?: () => void;
}

/**
 * Publish a dev-only handle for browser probes and agent sessions on
 * `window.__game`: the engine, `skip(seconds)`, and the game's own api record.
 * Call it in a game view's setup, inside `if (import.meta.env.DEV)`, so the
 * production bundle drops the record. The handle is removed on unmount.
 *
 * @param api - the module APIs and view state a probe reads.
 * @param options - how `skip()` advances time.
 * @example
 * if (import.meta.env.DEV) useDevHandle({ board: getBoard(), fitting });
 * // in a probe: window.__game.skip(600); window.__game.board.cells
 */
export function useDevHandle(api: Record<string, unknown>, options: DevHandleOptions = {}): void {
  const { engine } = useGame();
  const { chunk = 1, step } = options;
  const skip = (seconds: number): void => {
    for (let left = seconds; left > 0; left -= chunk) {
      engine.tickDriver.advanceTime(Math.min(chunk, left));
      step?.();
    }
  };
  const target = window as unknown as { __game?: unknown };
  const handle = { ...api, engine, skip };
  target.__game = handle;
  onScopeDispose(() => {
    if (target.__game === handle) delete target.__game;
  });
}
