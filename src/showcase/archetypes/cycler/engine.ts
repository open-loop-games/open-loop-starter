/**
 * The game's engine, with no Vue component in its import graph. A headless
 * script (a probe, a balance script, beat saves) imports this file, never
 * `boot.ts`: vite-node sends a `.vue` import down its web transform path, which
 * fails on a cold dependency cache.
 */
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootEngine } from '@/boot';
import { createCyclerModules } from './modules';

const GAME_ID = 'cycler';
const MOD_ID = 'cycler';
const MOD_NAME = 'Skerry Light';

export interface CyclerEngineOptions {
  /** Persistence namespace override. Unique per engine; it isolates headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default cycler modules. */
  extraModules?: EngineModule[];
  /** Raise the game loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the cycler modules.
 * Does NOT call `engine.load()` — `CyclerAppRoot.vue`'s play-session composable
 * owns the resume sequence.
 */
export function createCyclerEngine(options?: CyclerEngineOptions): { engine: Engine } {
  const modules = [...createCyclerModules(), ...(options?.extraModules ?? [])];
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: options?.persistenceNamespace,
    maxDeltaTime: options?.maxDeltaTime,
    mods: [{ id: MOD_ID, displayName: MOD_NAME, modules }],
  });
  return { engine };
}
