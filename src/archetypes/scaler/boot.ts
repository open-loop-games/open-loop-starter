import { type App, defineComponent, h } from 'vue';
import { type Engine, type EngineModule } from 'open-loop-engine';
import { bootApp, bootEngine } from '@/boot';
import { createScalerModules } from './modules';
import { DEFAULT_SCALER_DATA } from './data';
import { applyScalerOverrides, type ScalerOverrides } from './data/overrides';
import type { ScalerData } from './data/types';

const GAME_ID = 'scaler-pilot';
const MOD_ID = 'synergism-slim';
const MOD_NAME = 'Synergism (slim port)';

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

// Placeholder root component. Leaf 2b replaces this with ScalerAppRoot.vue
// (3-tier panel layout per archetypes/scaler.md § 6). The placeholder lets
// boot.ts + the smoke test land in 2c without blocking on the UI surface.
const ScalerAppRoot = defineComponent({
  name: 'ScalerAppRoot',
  setup() {
    return () =>
      h(
        'div',
        { style: 'padding: 1rem; font-family: system-ui;' },
        'Scaler archetype — UI lands in leaf 2b. Engine is running; inspect via dev panel.',
      );
  },
});

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
    provides: [['scaler:data', data]],
  });
  return { engine, data, app, mount };
}
