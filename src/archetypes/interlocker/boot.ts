import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import InterlockerAppRoot from './ui/InterlockerAppRoot.vue';
import { createInterlockerModules } from './modules';
import { DEFAULT_INTERLOCKER_DATA } from './data';
import type { InterlockerData } from './data/types';

const GAME_ID = 'interlocker-pilot';
const MOD_ID = 'kittens';
const MOD_NAME = 'Kittens';

export interface InterlockerBootResult {
  engine: Engine;
  data: InterlockerData;
  /** Underlying Vue app — exposed so the gallery sandbox can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface InterlockerEngineOptions {
  /** Persistence namespace override. Unique per-engine, used to isolate sim runs. */
  persistenceNamespace?: string;
  /** Extra modules registered into the Kittens mod alongside the default
   *  interlocker modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. See producer/boot.ts for context. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the Interlocker archetype modules.
 * Does NOT call `engine.start()` / `engine.load()` — the AppRoot owns the
 * resume sequence.
 *
 * Phase 1: module bodies are STUBS — boot succeeds but invoking the stubbed
 * API methods throws `'Not implemented in Phase 1'`. Phase 2 worktree fan-out
 * fills bodies for resources/buildings/village; Phase 3 fills
 * sciences/workshop.
 */
export function createInterlockerEngine(options?: InterlockerEngineOptions): {
  engine: Engine;
  data: InterlockerData;
} {
  const data = DEFAULT_INTERLOCKER_DATA;
  const modules = [...createInterlockerModules(data), ...(options?.extraModules ?? [])];
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: options?.persistenceNamespace,
    maxDeltaTime: options?.maxDeltaTime,
    mods: [
      {
        id: MOD_ID,
        name: MOD_NAME,
        modules,
      },
    ],
  });
  return { engine, data };
}

/**
 * Build a ready-to-mount Vue app via the shared starter boot factory.
 *
 * Usage:
 * ```ts
 * const { mount } = createApp();
 * mount('#app');
 * ```
 */
export function createApp(): InterlockerBootResult {
  const { engine, data } = createInterlockerEngine();
  const { app, mount } = bootApp({
    root: InterlockerAppRoot,
    engine,
    provides: [['interlocker:data', data]],
  });
  return { engine, data, app, mount };
}
