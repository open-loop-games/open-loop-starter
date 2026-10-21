import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import ProducerAppRoot from './ui/ProducerAppRoot.vue';
import { createProducerEngine, type ProducerEngineOptions } from './engine';

export { createProducerEngine } from './engine';
export type { ProducerEngineOptions } from './engine';

export interface ProducerBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
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
