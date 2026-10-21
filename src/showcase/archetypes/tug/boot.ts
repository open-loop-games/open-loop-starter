import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import TugAppRoot from './ui/TugAppRoot.vue';
import { createTugEngine, type TugEngineOptions } from './engine';

export { createTugEngine } from './engine';
export type { TugEngineOptions } from './engine';

export interface TugBootResult {
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
export function createApp(options?: TugEngineOptions): TugBootResult {
  const { engine } = createTugEngine(options);
  const { app, mount } = bootApp({ root: TugAppRoot, engine });
  return { engine, app, mount };
}
