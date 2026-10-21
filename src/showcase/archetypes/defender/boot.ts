import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import DefenderAppRoot from './ui/DefenderAppRoot.vue';
import { createDefenderEngine, type DefenderEngineOptions } from './engine';

export { createDefenderEngine } from './engine';
export type { DefenderEngineOptions } from './engine';

export interface DefenderBootResult {
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
export function createApp(options?: DefenderEngineOptions): DefenderBootResult {
  const { engine } = createDefenderEngine(options);
  const { app, mount } = bootApp({
    root: DefenderAppRoot,
    engine,
  });
  return { engine, app, mount };
}
