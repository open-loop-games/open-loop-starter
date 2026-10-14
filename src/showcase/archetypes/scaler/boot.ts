import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import ScalerAppRoot from './ui/ScalerAppRoot.vue';
import { createScalerModules } from './modules';

const GAME_ID = 'scaler';
const MOD_ID = 'scaler';
const MOD_NAME = 'Paragon';

export interface ScalerBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface ScalerEngineOptions {
  /** Persistence namespace override. Unique per engine; it isolates headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default scaler modules. */
  extraModules?: EngineModule[];
  /** Raise the game loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the scaler modules.
 * Does NOT call `engine.load()` — `ScalerAppRoot.vue`'s play-session composable
 * owns the resume sequence.
 */
export function createScalerEngine(options?: ScalerEngineOptions): { engine: Engine } {
  const modules = [...createScalerModules(), ...(options?.extraModules ?? [])];
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
export function createApp(options?: ScalerEngineOptions): ScalerBootResult {
  const { engine } = createScalerEngine(options);
  const { app, mount } = bootApp({ root: ScalerAppRoot, engine });
  return { engine, app, mount };
}
