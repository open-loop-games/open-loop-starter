import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import CyclerAppRoot from './ui/CyclerAppRoot.vue';
import { createCyclerModules, type CyclerModulesOptions } from './modules';

const GAME_ID = 'cycler';
const MOD_ID = 'cycler';
const MOD_NAME = 'Cycler';

export interface CyclerBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface CyclerEngineOptions {
  /** Persistence namespace override. Unique per-engine; used to isolate sim runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default cycler modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
  /** Balance overrides threaded to the module factories (threat, build, prestige, upgrade). */
  modules?: CyclerModulesOptions;
}

/**
 * Create an engine instance pre-wired with the Cycler modules (build → burn-tier
 * → cycle → prestige → upgrades; the barrel owns the install order and the peg
 * wiring). Does NOT call `engine.load()` — `CyclerAppRoot.vue` owns the resume
 * sequence via `useGameSession`.
 */
export function createCyclerEngine(options?: CyclerEngineOptions): { engine: Engine } {
  const modules = [...createCyclerModules(options?.modules), ...(options?.extraModules ?? [])];
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
export function createApp(options?: CyclerEngineOptions): CyclerBootResult {
  const { engine } = createCyclerEngine(options);
  const { app, mount } = bootApp({
    root: CyclerAppRoot,
    engine,
  });
  return { engine, app, mount };
}
