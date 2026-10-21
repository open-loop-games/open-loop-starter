import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import ExplorerAppRoot from './ui/ExplorerAppRoot.vue';
import { createExplorerEngine, type ExplorerEngineOptions } from './engine';

export { createExplorerEngine } from './engine';
export type { ExplorerEngineOptions } from './engine';

export interface ExplorerBootResult {
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
export function createApp(options?: ExplorerEngineOptions): ExplorerBootResult {
  const { engine } = createExplorerEngine(options);
  const { app, mount } = bootApp({
    root: ExplorerAppRoot,
    engine,
  });
  return { engine, app, mount };
}
