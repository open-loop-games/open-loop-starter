/**
 * The game's engine, with no Vue component in its import graph. A headless
 * script (a probe, a balance script, beat saves) imports this file, never
 * `boot.ts`: vite-node sends a `.vue` import down its web transform path, which
 * fails on a cold dependency cache.
 */
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootEngine } from '@/boot';
import { createPhaseShifterModules } from './modules';

const GAME_ID = 'phase-shifter';
const MOD_ID = 'phase-shifter';
const MOD_NAME = 'Phase-shifter';

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
