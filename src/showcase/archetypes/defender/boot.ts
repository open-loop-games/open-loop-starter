import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import DefenderAppRoot from './ui/DefenderAppRoot.vue';
import { createDefenderModules } from './modules';
import { DEFAULT_DEFENDER_DATA } from './data';
import type { DefenderData } from './data/types';

const GAME_ID = 'defender-pilot';
const MOD_ID = 'bloons-defense';
const MOD_NAME = 'Bloons Defense';

export interface DefenderBootResult {
  engine: Engine;
  data: DefenderData;
  /** Underlying Vue app — exposed so the gallery sandbox can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface DefenderEngineOptions {
  /** Persistence namespace override. Unique per-engine, used to isolate sim runs. */
  persistenceNamespace?: string;
  /** Extra modules registered into the Bloons Defense mod alongside the
   *  default defender modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. See producer/boot.ts for context. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the Defender archetype modules.
 * Does NOT call `engine.start()` / `engine.load()` / `round.startRound()` —
 * the AppRoot owns the resume sequence (engine.start → engine.load →
 * round.resetGame + round.startRound(1) when no in-progress round is loaded).
 *
 * Phase 1: module bodies are STUBS — boot succeeds but invoking the
 * stubbed API methods throws `'Not implemented in Phase 1'`. Phase 2/3
 * fan-out fills bodies.
 */
export function createDefenderEngine(options?: DefenderEngineOptions): {
  engine: Engine;
  data: DefenderData;
} {
  const data = DEFAULT_DEFENDER_DATA;
  const modules = [...createDefenderModules(data), ...(options?.extraModules ?? [])];
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
export function createApp(): DefenderBootResult {
  const { engine, data } = createDefenderEngine();
  const { app, mount } = bootApp({
    root: DefenderAppRoot,
    engine,
    provides: [['defender:data', data]],
  });
  return { engine, data, app, mount };
}
