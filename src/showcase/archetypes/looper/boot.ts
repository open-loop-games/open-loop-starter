import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import LooperAppRoot from './ui/LooperAppRoot.vue';
import { createLooperEngine, type LooperEngineOptions } from './engine';

export { createLooperEngine } from './engine';
export type { LooperEngineOptions } from './engine';

export interface LooperBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
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
export function createApp(options?: LooperEngineOptions): LooperBootResult {
  const { engine } = createLooperEngine(options);
  const { app, mount } = bootApp({
    root: LooperAppRoot,
    engine,
  });
  return { engine, app, mount };
}
