import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import PhaseShifterAppRoot from './ui/PhaseShifterAppRoot.vue';
import { createPhaseShifterModules } from './modules';

const GAME_ID = 'phase-shifter';
const MOD_ID = 'phase-shifter';
const MOD_NAME = 'Phase-shifter';

export interface PhaseShifterBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface PhaseShifterEngineOptions {
  /** Persistence namespace override. Unique per-engine; used to isolate headless runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the phase-shifter modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the game modules.
 * Does NOT call `engine.load()` — `PhaseShifterAppRoot.vue`, through `usePlaySession`, owns the
 * resume sequence.
 */
export function createPhaseShifterEngine(options?: PhaseShifterEngineOptions): { engine: Engine } {
  const modules = [...createPhaseShifterModules(), ...(options?.extraModules ?? [])];
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
export function createApp(options?: PhaseShifterEngineOptions): PhaseShifterBootResult {
  const { engine } = createPhaseShifterEngine(options);
  const { app, mount } = bootApp({
    root: PhaseShifterAppRoot,
    engine,
  });
  return { engine, app, mount };
}
