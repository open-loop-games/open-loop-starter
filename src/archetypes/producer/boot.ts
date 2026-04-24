import { type Engine, type EngineModule } from 'open-loop-engine';
import { bootApp, bootEngine } from '@/boot';
import ProducerAppRoot from './ui/ProducerAppRoot.vue';
import { createProducerModules } from './modules';
import { DEFAULT_PRODUCER_DATA } from './data';
import { applyProducerOverrides, type ProducerOverrides } from './data/overrides';
import type { ProducerData } from './data/types';

const GAME_ID = 'producer-pilot';
const MOD_ID = 'bakery';
const MOD_NAME = 'Bakery';

export interface ProducerBootResult {
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
  /**
   * Extra modules registered into the Bakery mod alongside the default
   * producer modules. Used by the balance bot (balance/bot.ts) and sim
   * harnesses to attach tick handlers / persistent state inside the
   * engine's namespace so `saveManager.import/export` reach them.
   */
  extraModules?: EngineModule[];
  /**
   * Raise the loop's `maxDeltaTime` cap. Used by benches profiling
   * `eventDrivenProbe`, which calls `simulateTick(dt)` with dt equal to the
   * smallest walker-visible event distance — often hundreds of seconds.
   * Default (1s) silently clamps those advances and collapses the probe to
   * fixed-tick. See OL-673.
   */
  maxDeltaTime?: number;
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
  const modules = [...createProducerModules(data), ...(options?.extraModules ?? [])];
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
export function createApp(overrides?: ProducerOverrides): ProducerBootResult {
  const { engine, data } = createProducerEngine(overrides);
  const { mount } = bootApp({
    root: ProducerAppRoot,
    engine,
    provides: [['producer:data', data]],
  });
  return { engine, data, mount };
}
