import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import PackerAppRoot from './ui/PackerAppRoot.vue';
import { createPackerModules } from './modules';

const GAME_ID = 'packer';
const MOD_ID = 'packer';
const MOD_NAME = 'Packer';

export interface PackerBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface PackerEngineOptions {
  /** Persistence namespace override. Unique per-engine; used to isolate headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the packer modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the game modules.
 * Does NOT call `engine.load()` — `PackerAppRoot.vue`, through `usePlaySession`, owns the
 * resume sequence.
 */
export function createPackerEngine(options?: PackerEngineOptions): { engine: Engine } {
  const modules = [...createPackerModules(), ...(options?.extraModules ?? [])];
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
export function createApp(options?: PackerEngineOptions): PackerBootResult {
  const { engine } = createPackerEngine(options);
  const { app, mount } = bootApp({
    root: PackerAppRoot,
    engine,
  });
  return { engine, app, mount };
}
