import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import LooperAppRoot from './ui/LooperAppRoot.vue';
import { createLooperModules } from './modules';

const GAME_ID = 'looper';
const MOD_ID = 'looper';
const MOD_NAME = 'Looper';

export interface LooperBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface LooperEngineOptions {
  /** Persistence namespace override. Unique per-engine; used to isolate headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the looper modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the game modules.
 * Does NOT call `engine.load()` — `LooperAppRoot.vue`, through `usePlaySession`, owns the
 * resume sequence.
 */
export function createLooperEngine(options?: LooperEngineOptions): { engine: Engine } {
  const modules = [...createLooperModules(), ...(options?.extraModules ?? [])];
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
export function createApp(options?: LooperEngineOptions): LooperBootResult {
  const { engine } = createLooperEngine(options);
  const { app, mount } = bootApp({
    root: LooperAppRoot,
    engine,
  });
  return { engine, app, mount };
}
