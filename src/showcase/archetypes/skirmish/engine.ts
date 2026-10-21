/**
 * The game's engine, with no Vue component in its import graph. A headless
 * script (a probe, a balance script, beat saves) imports this file, never
 * `boot.ts`: vite-node sends a `.vue` import down its web transform path, which
 * fails on a cold dependency cache.
 */
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootEngine } from '@/boot';
import { createSkirmishModules } from './modules';

const GAME_ID = 'skirmish';
const MOD_ID = 'skirmish';
const MOD_NAME = 'Chrome & Cantrip';

export interface SkirmishEngineOptions {
  /** Persistence namespace override. Unique per engine; it isolates headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default skirmish modules. */
  extraModules?: EngineModule[];
  /** Raise the game loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
  /** Autosave period in ms; headless engines pass 0 so they never write. */
  autoSaveInterval?: number;
}

/**
 * Create an engine instance pre-wired with the skirmish modules.
 * Does NOT call `engine.load()` — `SkirmishAppRoot.vue`'s play-session composable
 * owns the resume sequence.
 */
export function createSkirmishEngine(options?: SkirmishEngineOptions): { engine: Engine } {
  const modules = [...createSkirmishModules(), ...(options?.extraModules ?? [])];
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: options?.persistenceNamespace,
    maxDeltaTime: options?.maxDeltaTime,
    autoSaveInterval: options?.autoSaveInterval,
    mods: [{ id: MOD_ID, displayName: MOD_NAME, modules }],
  });
  return { engine };
}
