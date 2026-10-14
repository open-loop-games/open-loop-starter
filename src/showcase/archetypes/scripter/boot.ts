import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import ScripterAppRoot from './ui/ScripterAppRoot.vue';
import { createScripterModules } from './modules';

const GAME_ID = 'scripter';
const MOD_ID = 'scripter';
const MOD_NAME = 'Inkfist Dojo';

export interface ScripterBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface ScripterEngineOptions {
  /** Persistence namespace override. Unique per engine; it isolates headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default scripter modules. */
  extraModules?: EngineModule[];
  /** Raise the game loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the scripter modules.
 * Does NOT call `engine.load()` — `ScripterAppRoot.vue`'s play-session composable
 * owns the resume sequence.
 */
export function createScripterEngine(options?: ScripterEngineOptions): { engine: Engine } {
  const modules = [...createScripterModules(), ...(options?.extraModules ?? [])];
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
export function createApp(options?: ScripterEngineOptions): ScripterBootResult {
  const { engine } = createScripterEngine(options);
  const { app, mount } = bootApp({ root: ScripterAppRoot, engine });
  return { engine, app, mount };
}
