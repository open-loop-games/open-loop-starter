import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import ExplorerAppRoot from './ui/ExplorerAppRoot.vue';
import { createExplorerModules } from './modules';

const GAME_ID = 'explorer';
const MOD_ID = 'explorer';
const MOD_NAME = 'Explorer';

export interface ExplorerBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface ExplorerEngineOptions {
  /** Persistence namespace override. Unique per-engine; used to isolate headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the explorer modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the game modules.
 * Does NOT call `engine.load()` — `ExplorerAppRoot.vue`, through `usePlaySession`, owns the
 * resume sequence.
 */
export function createExplorerEngine(options?: ExplorerEngineOptions): { engine: Engine } {
  const modules = [...createExplorerModules(), ...(options?.extraModules ?? [])];
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
export function createApp(options?: ExplorerEngineOptions): ExplorerBootResult {
  const { engine } = createExplorerEngine(options);
  const { app, mount } = bootApp({
    root: ExplorerAppRoot,
    engine,
  });
  return { engine, app, mount };
}
