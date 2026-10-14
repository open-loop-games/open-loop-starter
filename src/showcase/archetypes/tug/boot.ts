import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import TugAppRoot from './ui/TugAppRoot.vue';
import { createTugModules } from './modules';

const GAME_ID = 'tug';
const MOD_ID = 'tug';
const MOD_NAME = 'Hold the Causeway';

export interface TugBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface TugEngineOptions {
  /** Persistence namespace override. Unique per engine; it isolates headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default tug modules. */
  extraModules?: EngineModule[];
  /** Raise the game loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the tug modules.
 * Does NOT call `engine.load()` — `TugAppRoot.vue`'s play-session composable
 * owns the resume sequence.
 */
export function createTugEngine(options?: TugEngineOptions): { engine: Engine } {
  const modules = [...createTugModules(), ...(options?.extraModules ?? [])];
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: options?.persistenceNamespace,
    maxDeltaTime: options?.maxDeltaTime,
    mods: [{ id: MOD_ID, displayName: MOD_NAME, modules }],
  });
  return { engine };
}

/**
 * Build a ready-to-mount Vue app via the shared starter boot factory.
 *
 * ```ts
 * const { mount } = createApp();
 * mount('#app');
 * ```
 */
export function createApp(options?: TugEngineOptions): TugBootResult {
  const { engine } = createTugEngine(options);
  const { app, mount } = bootApp({ root: TugAppRoot, engine });
  return { engine, app, mount };
}
