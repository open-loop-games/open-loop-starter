import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import SurvivorAppRoot from './ui/SurvivorAppRoot.vue';
import { createSurvivorModules } from './modules';

const GAME_ID = 'survivor';
const MOD_ID = 'survivor';
const MOD_NAME = 'Survivor';

export interface SurvivorBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface SurvivorEngineOptions {
  /** Persistence namespace override. Unique per-engine; used to isolate sim runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default game modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the game modules.
 * Does NOT call `engine.load()` — `SurvivorAppRoot.vue::startGame` owns the
 * resume sequence.
 */
export function createSurvivorEngine(options?: SurvivorEngineOptions): { engine: Engine } {
  const modules = [...createSurvivorModules(), ...(options?.extraModules ?? [])];
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
export function createApp(options?: SurvivorEngineOptions): SurvivorBootResult {
  const { engine } = createSurvivorEngine(options);
  const { app, mount } = bootApp({
    root: SurvivorAppRoot,
    engine,
  });
  return { engine, app, mount };
}
