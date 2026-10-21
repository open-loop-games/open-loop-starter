import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import ScripterAppRoot from './ui/ScripterAppRoot.vue';
import { createScripterEngine, type ScripterEngineOptions } from './engine';

export { createScripterEngine } from './engine';
export type { ScripterEngineOptions } from './engine';

export interface ScripterBootResult {
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
export function createApp(options?: ScripterEngineOptions): ScripterBootResult {
  const { engine } = createScripterEngine(options);
  const { app, mount } = bootApp({ root: ScripterAppRoot, engine });
  return { engine, app, mount };
}
