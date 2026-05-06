import { type App } from 'vue';
import {
  Decimal,
  type Engine,
  type EngineModule,
  type GameStateAccessor,
  type GameStateMutator,
} from 'open-loop-engine';
import { bootApp, bootEngine } from '@/boot';
import { createScalerModules } from './modules';
import { DEFAULT_SCALER_DATA } from './data';
import { applyScalerOverrides, type ScalerOverrides } from './data/overrides';
import type { ScalerData } from './data/types';
import { SCALER_DATA_KEY } from './composables/useScalerData';
import ScalerAppRoot from './ui/ScalerAppRoot.vue';

const GAME_ID = 'scaler-pilot';
const MOD_ID = 'synergism-slim';
const MOD_NAME = 'Synergism (slim port)';

// Scaler Gates only use cumulative-gte / count-gte / unlock / combinators —
// none of those reach into the accessor (they read through CategoryEntrySignals
// and Resource.cumulative). NOOP satisfies getAmbientGateRuntime's non-
// undefined contract without standing up an archetype-specific accessor.
// Mirrors producer/boot.ts NOOP_ACCESSOR.
const NOOP_ACCESSOR: GameStateAccessor & GameStateMutator = {
  getResource: () => Decimal.dZero,
  getRate: () => Decimal.dZero,
  isUnlocked: () => false,
  getState: () => undefined,
  applyResourceOp: () => {},
  setUnlocked: () => {},
  setState: () => {},
};

export interface ScalerBootResult {
  engine: Engine;
  data: ScalerData;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface ScalerEngineOptions {
  /** Persistence namespace override. Unique per-engine; isolates sim runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default scaler modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap (e.g. for event-driven probes). */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the Scaler archetype modules.
 * Returned alongside the active data bag so workbench + tests can perturb
 * the same object the modules closed over. Does NOT call `engine.load()`
 * — UI / sim caller owns the resume sequence (matches looper precedent).
 */
export function createScalerEngine(
  overrides?: ScalerOverrides,
  options?: ScalerEngineOptions,
): { engine: Engine; data: ScalerData } {
  const data = applyScalerOverrides(DEFAULT_SCALER_DATA, overrides);
  const modules = [...createScalerModules(data), ...(options?.extraModules ?? [])];
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: options?.persistenceNamespace,
    maxDeltaTime: options?.maxDeltaTime,
    accessor: NOOP_ACCESSOR,
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
export function createApp(overrides?: ScalerOverrides): ScalerBootResult {
  const { engine, data } = createScalerEngine(overrides);
  const { app, mount } = bootApp({
    root: ScalerAppRoot,
    engine,
    provides: [[SCALER_DATA_KEY, data]],
  });
  return { engine, data, app, mount };
}
