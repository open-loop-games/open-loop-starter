import { type App } from 'vue';
import { type Engine, type EngineModule } from 'open-loop-engine';
import { bootApp, bootEngine } from '@/boot';
import LooperAppRoot from './ui/LooperAppRoot.vue';
import { createLooperModules } from './modules';
import { DEFAULT_LOOPER_DATA } from './data';
import { applyLooperOverrides, type LooperOverrides } from './data/overrides';
import type { LooperData } from './data/types';

const GAME_ID = 'looper-pilot';
const MOD_ID = 'classic-adventuring';
const MOD_NAME = 'Classic Adventuring';

export interface LooperBootResult {
  engine: Engine;
  data: LooperData;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface LooperEngineOptions {
  /** Persistence namespace override. Unique per-engine; used to isolate sim runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default looper modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the Looper archetype modules.
 * Does NOT call `engine.load()` — `LooperAppRoot.vue::startGame` owns the
 * resume sequence (mirrors Producer / Ambient).
 */
export function createLooperEngine(
  overrides?: LooperOverrides,
  options?: LooperEngineOptions,
): { engine: Engine; data: LooperData } {
  const data = applyLooperOverrides(DEFAULT_LOOPER_DATA, overrides);
  const modules = [...createLooperModules(data), ...(options?.extraModules ?? [])];
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
export function createApp(overrides?: LooperOverrides): LooperBootResult {
  const { engine, data } = createLooperEngine(overrides);
  const { app, mount } = bootApp({
    root: LooperAppRoot,
    engine,
    provides: [['looper:data', data]],
  });
  return { engine, data, app, mount };
}
