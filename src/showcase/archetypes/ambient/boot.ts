import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import AmbientAppRoot from './ui/AmbientAppRoot.vue';
import { createAmbientModules } from './modules';
import { DEFAULT_AMBIENT_DATA } from './data';
import type { AmbientData } from './data/types';

const GAME_ID = 'ambient-pilot';
const MOD_ID = 'cozy-farm';
const MOD_NAME = 'Cozy Farm';

export interface AmbientBootResult {
  engine: Engine;
  data: AmbientData;
  /** Underlying Vue app — exposed so the gallery sandbox can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface AmbientEngineOptions {
  /** Persistence namespace override. Unique per-engine, used to isolate sim runs. */
  persistenceNamespace?: string;
  /** Extra modules registered into the Cozy Farm mod alongside the default ambient modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. See producer/boot.ts for context. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the Ambient archetype modules.
 * Does NOT call `engine.load()` or `processOfflineTime` — AppRoot owns the
 * resume sequence: `AmbientAppRoot.vue::startGame` writes
 * `sessionClock.lastResumeGapSec`, calls `processOfflineTime`, then
 * `refreshElapsedAtResume()`.
 *
 * Balance-constant overrides route via `AmbientTuningRegistryKey.pushScope`,
 * not through this entrypoint. Content-shape forks edit `data/*.ts` in place.
 */
export function createAmbientEngine(options?: AmbientEngineOptions): {
  engine: Engine;
  data: AmbientData;
} {
  const data = DEFAULT_AMBIENT_DATA;
  const modules = [...createAmbientModules(data), ...(options?.extraModules ?? [])];
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
export function createApp(): AmbientBootResult {
  const { engine, data } = createAmbientEngine();
  const { app, mount } = bootApp({
    root: AmbientAppRoot,
    engine,
  });
  return { engine, data, app, mount };
}
