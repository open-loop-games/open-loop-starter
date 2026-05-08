import { type App } from 'vue';
import { type Engine, type EngineModule } from 'open-loop-engine';
import { bootApp, bootEngine } from '@/boot';
import ScalerAppRoot from './ui/ScalerAppRoot.vue';
import { createScalerModules } from './modules';

const GAME_ID = 'scaler-pilot';
export const SCALER_MOD_ID = 'antimatter-physics';
const MOD_NAME = 'Antimatter Physics';

export interface ScalerBootResult {
  engine: Engine;
  app: App;
  mount: (selector: string | Element) => void;
}

export interface ScalerEngineOptions {
  /** Persistence namespace override. Unique per-engine; used to isolate sim runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default scaler modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the Scaler archetype modules.
 * Does NOT call `engine.load()` — `ScalerAppRoot.vue::startGame` owns the
 * resume sequence.
 */
export function createScalerEngine(options?: ScalerEngineOptions): { engine: Engine } {
  const modules = [...createScalerModules(), ...(options?.extraModules ?? [])];
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: options?.persistenceNamespace,
    maxDeltaTime: options?.maxDeltaTime,
    mods: [
      {
        id: SCALER_MOD_ID,
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
export function createApp(options?: ScalerEngineOptions): ScalerBootResult {
  const { engine } = createScalerEngine(options);
  const { app, mount } = bootApp({
    root: ScalerAppRoot,
    engine,
  });
  return { engine, app, mount };
}
