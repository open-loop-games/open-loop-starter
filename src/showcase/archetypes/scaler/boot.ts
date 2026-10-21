import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import ScalerAppRoot from './ui/ScalerAppRoot.vue';
import { createScalerEngine, type ScalerEngineOptions } from './engine';

export { createScalerEngine } from './engine';
export type { ScalerEngineOptions } from './engine';

export interface ScalerBootResult {
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
export function createApp(options?: ScalerEngineOptions): ScalerBootResult {
  const { engine } = createScalerEngine(options);
  const { app, mount } = bootApp({ root: ScalerAppRoot, engine });
  return { engine, app, mount };
}
