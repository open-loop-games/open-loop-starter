import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import SkirmishAppRoot from './ui/SkirmishAppRoot.vue';
import { createSkirmishModules } from './modules';

const GAME_ID = 'skirmish';
const MOD_ID = 'skirmish';
const MOD_NAME = 'Chrome & Cantrip';

export interface SkirmishBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface SkirmishEngineOptions {
  /** Persistence namespace override. Unique per engine; it isolates headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default skirmish modules. */
  extraModules?: EngineModule[];
  /** Raise the game loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
  /** Autosave period in ms; headless engines pass 0 so they never write. */
  autoSaveInterval?: number;
}

/**
 * Create an engine instance pre-wired with the skirmish modules.
 * Does NOT call `engine.load()` — `SkirmishAppRoot.vue`'s play-session composable
 * owns the resume sequence.
 */
export function createSkirmishEngine(options?: SkirmishEngineOptions): { engine: Engine } {
  const modules = [...createSkirmishModules(), ...(options?.extraModules ?? [])];
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: options?.persistenceNamespace,
    maxDeltaTime: options?.maxDeltaTime,
    autoSaveInterval: options?.autoSaveInterval,
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
export function createApp(options?: SkirmishEngineOptions): SkirmishBootResult {
  const { engine } = createSkirmishEngine(options);
  const { app, mount } = bootApp({ root: SkirmishAppRoot, engine });
  return { engine, app, mount };
}
