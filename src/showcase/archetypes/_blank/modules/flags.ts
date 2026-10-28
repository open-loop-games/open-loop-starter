import { createFlag, withPersistentContext, type EngineModule } from '@open-loop/engine';
import { GAME_FLAGS } from '../data/game';

/**
 * Flags module — the game's saved booleans, the ones a `flag` Gate reads and a
 * `flag` effect writes. Each id in `GAME_FLAGS` becomes a saved flag in the
 * engine's flag registry, where every Gate, effect and dialog reads it through
 * the engine's accessor. A flag id the game does not list throws where it is
 * read.
 *
 * DELETE-OR-RESHAPE: keep the shape if your game has flags; list its ids in
 * `GAME_FLAGS`. A flag derived from game state is `createFlag({ id, value })`.
 */
export function createFlagsModule(): EngineModule {
  return {
    id: 'game/flags',
    install() {
      withPersistentContext('game/flags', () => {
        for (const id of GAME_FLAGS) createFlag({ id });
      });
    },
  };
}
