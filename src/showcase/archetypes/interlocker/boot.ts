import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import InterlockerAppRoot from './ui/InterlockerAppRoot.vue';
import { createInterlockerModules } from './modules';

const GAME_ID = 'interlocker';
const MOD_ID = 'interlocker';
const MOD_NAME = 'Interlocker';

export interface InterlockerBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface InterlockerEngineOptions {
  /** Persistence namespace override. Unique per-engine; used to isolate headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the interlocker modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the game modules.
 * Does NOT call `engine.load()` — `InterlockerAppRoot.vue`, through `usePlaySession`, owns the
 * resume sequence.
 */
export function createInterlockerEngine(options?: InterlockerEngineOptions): { engine: Engine } {
  const modules = [...createInterlockerModules(), ...(options?.extraModules ?? [])];
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: options?.persistenceNamespace,
    maxDeltaTime: options?.maxDeltaTime,
    mods: [
      {
        id: MOD_ID,
        displayName: MOD_NAME,
        modules,
      },
    ],
  });
  return { engine };
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
export function createApp(options?: InterlockerEngineOptions): InterlockerBootResult {
  const { engine } = createInterlockerEngine(options);
  const { app, mount } = bootApp({
    root: InterlockerAppRoot,
    engine,
  });
  return { engine, app, mount };
}
