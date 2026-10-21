import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import InterlockerAppRoot from './ui/InterlockerAppRoot.vue';
import { createInterlockerEngine, type InterlockerEngineOptions } from './engine';

export { createInterlockerEngine } from './engine';
export type { InterlockerEngineOptions } from './engine';

export interface InterlockerBootResult {
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
export function createApp(options?: InterlockerEngineOptions): InterlockerBootResult {
  const { engine } = createInterlockerEngine(options);
  const { app, mount } = bootApp({
    root: InterlockerAppRoot,
    engine,
  });
  return { engine, app, mount };
}
