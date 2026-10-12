import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import TugAppRoot from './ui/TugAppRoot.vue';
import { createTugModules, type TugModulesOptions } from './modules';
import { DEFAULT_TUG_DATA } from './data';
import type { TugData } from './data/types';

const GAME_ID = 'tug-pilot';
const MOD_ID = 'sci-fi-armada';
const MOD_NAME = 'SciFi Armada';

export interface TugBootResult {
  engine: Engine;
  data: TugData;
  /** Underlying Vue app — exposed so the gallery sandbox can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface TugEngineOptions {
  /** Persistence namespace override. Unique per-engine, used to isolate headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered into the SciFi Armada mod alongside the default tug modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap — headless probes advance in coarse
   *  steps that the default cap would clamp. */
  maxDeltaTime?: number;
  /** Autosave period in ms; headless engines pass 0 so they never write. */
  autoSaveInterval?: number;
  /** Per-side `opponent-bot` install options + meta-progression toggle.
   *  Headless engines override; production uses defaults. */
  modules?: TugModulesOptions;
}

/**
 * Create an engine instance pre-wired with the Tug archetype modules.
 * Does NOT call `engine.start()` / `engine.load()` / `match.start()` — the
 * AppRoot owns the resume sequence: engine.start → engine.load →
 * match.start when no in-progress match is loaded.
 */
export function createTugEngine(options?: TugEngineOptions): {
  engine: Engine;
  data: TugData;
} {
  const data = DEFAULT_TUG_DATA;
  const modules = [...createTugModules(data, options?.modules), ...(options?.extraModules ?? [])];
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: options?.persistenceNamespace,
    maxDeltaTime: options?.maxDeltaTime,
    autoSaveInterval: options?.autoSaveInterval,
    mods: [
      {
        id: MOD_ID,
        displayName: MOD_NAME,
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
export function createApp(): TugBootResult {
  const { engine, data } = createTugEngine();
  const { app, mount } = bootApp({
    root: TugAppRoot,
    engine,
    provides: [['tug:data', data]],
  });
  return { engine, data, app, mount };
}
