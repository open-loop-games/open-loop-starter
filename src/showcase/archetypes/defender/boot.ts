import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import DefenderAppRoot from './ui/DefenderAppRoot.vue';
import { createDefenderModules } from './modules';

const GAME_ID = 'defender';
const MOD_ID = 'defender';
const MOD_NAME = 'Defender';

export interface DefenderBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface DefenderEngineOptions {
  /** Persistence namespace override. Unique per-engine; used to isolate headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the defender modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the game modules.
 * Does NOT call `engine.load()` — `DefenderAppRoot.vue`, through `usePlaySession`, owns the
 * resume sequence.
 */
export function createDefenderEngine(options?: DefenderEngineOptions): { engine: Engine } {
  const modules = [...createDefenderModules(), ...(options?.extraModules ?? [])];
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
export function createApp(options?: DefenderEngineOptions): DefenderBootResult {
  const { engine } = createDefenderEngine(options);
  const { app, mount } = bootApp({
    root: DefenderAppRoot,
    engine,
  });
  return { engine, app, mount };
}
