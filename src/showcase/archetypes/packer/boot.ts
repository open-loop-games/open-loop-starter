import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import PackerAppRoot from './ui/PackerAppRoot.vue';
import { createPackerEngine, type PackerEngineOptions } from './engine';

export { createPackerEngine } from './engine';
export type { PackerEngineOptions } from './engine';

export interface PackerBootResult {
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
export function createApp(options?: PackerEngineOptions): PackerBootResult {
  const { engine } = createPackerEngine(options);
  const { app, mount } = bootApp({
    root: PackerAppRoot,
    engine,
  });
  return { engine, app, mount };
}
