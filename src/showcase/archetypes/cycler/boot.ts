import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import CyclerAppRoot from './ui/CyclerAppRoot.vue';
import { createCyclerEngine, type CyclerEngineOptions } from './engine';

export { createCyclerEngine } from './engine';
export type { CyclerEngineOptions } from './engine';

export interface CyclerBootResult {
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
export function createApp(options?: CyclerEngineOptions): CyclerBootResult {
  const { engine } = createCyclerEngine(options);
  const { app, mount } = bootApp({ root: CyclerAppRoot, engine });
  return { engine, app, mount };
}
