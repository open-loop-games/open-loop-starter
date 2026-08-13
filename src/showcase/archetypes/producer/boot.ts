import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import ProducerAppRoot from './ui/ProducerAppRoot.vue';
import { createProducerModules } from './modules';
import { DEFAULT_PRODUCER_DATA } from './data';

const GAME_ID = 'producer';
const MOD_ID = 'producer';
const MOD_NAME = 'Producer';

export interface ProducerBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface ProducerEngineOptions {
  /** Persistence namespace override. Unique per-engine; used to isolate sim runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default producer modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
}

/**
 * Create an engine instance pre-wired with the producer modules.
 * Does NOT call `engine.load()` — `ProducerAppRoot.vue`'s session composable
 * owns the resume sequence.
 */
export function createProducerEngine(options?: ProducerEngineOptions): { engine: Engine } {
  const modules = [
    ...createProducerModules(DEFAULT_PRODUCER_DATA),
    ...(options?.extraModules ?? []),
  ];
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: options?.persistenceNamespace,
    maxDeltaTime: options?.maxDeltaTime,
    mods: [{ id: MOD_ID, name: MOD_NAME, modules }],
  });
  return { engine };
}

/**
 * Build a ready-to-mount Vue app via the shared starter boot factory.
 *
 * ```ts
 * const { mount } = createApp();
 * mount('#app');
 * ```
 */
export function createApp(options?: ProducerEngineOptions): ProducerBootResult {
  const { engine } = createProducerEngine(options);
  const { app, mount } = bootApp({ root: ProducerAppRoot, engine });
  return { engine, app, mount };
}
