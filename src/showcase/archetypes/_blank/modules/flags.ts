import {
  persistent,
  withPersistentContext,
  type EngineModule,
  type Persistent,
} from '@open-loop/engine';
import { GAME_FLAGS, type GameFlag } from '../data/game';

/**
 * Flags module — the game's saved booleans, the ones a `flag` Gate reads and a
 * `flag` effect writes. `../modules/index.ts` hands `getFlag` and `setFlag` to
 * the engine's `createGameStateAccessor`, so every Gate, effect and dialog in
 * the game reads and writes these through the engine's accessor.
 *
 * The module and the two functions are made together, once per engine: the
 * accessor is built at `start()`, before any module installs, and reads the
 * saved refs only when a Gate or an effect runs. So two engines on one page
 * (the game and a balance workbench run) each read their own flags.
 *
 * DELETE-OR-RESHAPE: keep the shape if your game has flags; list its ids in
 * `GAME_FLAGS`.
 */
export interface GameFlags {
  module: EngineModule;
  /** Throws on an id missing from `GAME_FLAGS`, so a typo fails where it is read. */
  getFlag(id: string): boolean;
  setFlag(id: string, value: boolean): void;
}

export function createFlags(): GameFlags {
  let saved: Record<GameFlag, Persistent<boolean>> | undefined;

  function flagRef(id: string): Persistent<boolean> {
    if (!saved) throw new Error(`[game/flags] flag '${id}' read before the flags module installed`);
    const ref = saved[id as GameFlag];
    if (!ref) throw new Error(`[game/flags] no flag '${id}': add it to GAME_FLAGS in data/game.ts`);
    return ref;
  }

  return {
    module: {
      id: 'game/flags',
      install() {
        saved = withPersistentContext(
          'game/flags',
          () =>
            Object.fromEntries(
              GAME_FLAGS.map((id) => [id, persistent<boolean>(false, { id })]),
            ) as Record<GameFlag, Persistent<boolean>>,
        );
      },
    },
    getFlag: (id) => flagRef(id).value,
    setFlag: (id, value) => {
      flagRef(id).value = value;
    },
  };
}
