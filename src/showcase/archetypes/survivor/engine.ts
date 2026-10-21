/**
 * The game's engine, with no Vue component in its import graph. A headless
 * script (a probe, a balance script, beat saves) imports this file, never
 * `boot.ts`: vite-node sends a `.vue` import down its web transform path, which
 * fails on a cold dependency cache.
 */
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootEngine } from '@/boot';
import { INTERVAL_RATE, createSurvivorModules } from './modules';

const GAME_ID = 'survivor';
const MOD_ID = 'survivor';
const MOD_NAME = 'One More Take';

export interface SurvivorEngineOptions {
  /** Persistence namespace override. Unique per engine; it isolates headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default survivor modules. */
  extraModules?: EngineModule[];
}

/**
 * Create an engine instance pre-wired with the survivor modules.
 * Does NOT call `engine.load()` — `SurvivorAppRoot.vue`'s play-session composable
 * owns the resume sequence.
 */
export function createSurvivorEngine(options?: SurvivorEngineOptions): { engine: Engine } {
  const modules = [...createSurvivorModules(), ...(options?.extraModules ?? [])];
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: options?.persistenceNamespace,
    intervalRate: INTERVAL_RATE,
    tickMode: 'fixed',
    mods: [{ id: MOD_ID, displayName: MOD_NAME, modules }],
  });
  return { engine };
}
