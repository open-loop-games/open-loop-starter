import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import SkirmishAppRoot from './ui/SkirmishAppRoot.vue';
import { createSkirmishEngine, type SkirmishEngineOptions } from './engine';

export { createSkirmishEngine } from './engine';
export type { SkirmishEngineOptions } from './engine';

export interface SkirmishBootResult {
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
export function createApp(options?: SkirmishEngineOptions): SkirmishBootResult {
  const { engine } = createSkirmishEngine(options);
  const { app, mount } = bootApp({ root: SkirmishAppRoot, engine });
  return { engine, app, mount };
}
