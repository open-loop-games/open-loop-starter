import { createApp as createVueApp, type App } from 'vue';
import { createEngine, type Engine } from 'open-loop-engine';
import { sharedBase } from '@/modules';
import { vHoldRepeat } from '@/lib';
import ProducerAppRoot from './ui/ProducerAppRoot.vue';
import { createProducerModules } from './modules';
import { DEFAULT_PRODUCER_DATA } from './data';
import { applyProducerOverrides, type ProducerOverrides } from './data/overrides';
import type { ProducerData } from './data/types';

const GAME_ID = 'producer-pilot';
const MOD_ID = 'bakery';
const MOD_NAME = 'Bakery';

export interface ProducerBootResult {
  app: App;
  engine: Engine;
  data: ProducerData;
  mount: (selector: string | Element) => void;
}

/** Engine-config knobs exposed to consumers (sim tests, workbench). Keep
 *  the surface minimal — each new knob should earn its keep. */
export interface ProducerEngineOptions {
  /**
   * Persistence namespace override. Unique per-engine, used to isolate sim
   * runs that share a process (persistent refs collide otherwise).
   */
  persistenceNamespace?: string;
}

/**
 * Create an engine instance pre-wired with the Producer archetype modules.
 * Returned alongside the active data bag so the workbench + tests can
 * perturb the same object the modules closed over.
 */
export function createProducerEngine(
  overrides?: ProducerOverrides,
  options?: ProducerEngineOptions,
): {
  engine: Engine;
  data: ProducerData;
} {
  const data = applyProducerOverrides(DEFAULT_PRODUCER_DATA, overrides);
  const engine = createEngine({
    gameId: GAME_ID,
    tickRate: 20,
    autoSaveInterval: 60_000,
    maxSaveSlots: 30,
    persistenceNamespace: options?.persistenceNamespace,
    mods: [
      {
        id: MOD_ID,
        name: MOD_NAME,
        modules: [...sharedBase, ...createProducerModules(data)],
      },
    ],
  });
  return { engine, data };
}

/**
 * Build a ready-to-mount Vue app. Injects the engine + click directive and
 * wires screen routing through `ProducerAppRoot.vue`.
 *
 * Usage:
 * ```ts
 * const { mount } = createApp();
 * mount('#app');
 * ```
 */
export function createApp(overrides?: ProducerOverrides): ProducerBootResult {
  const { engine, data } = createProducerEngine(overrides);

  const app = createVueApp(ProducerAppRoot);
  app.directive('hold-repeat', vHoldRepeat);
  app.provide('engine', engine);
  app.provide('producer:data', data);

  return {
    app,
    engine,
    data,
    mount(target) {
      app.mount(target);
    },
  };
}
