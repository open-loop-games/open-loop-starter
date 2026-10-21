import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import SurvivorAppRoot from './ui/SurvivorAppRoot.vue';
import { createSurvivorEngine, type SurvivorEngineOptions } from './engine';

export { createSurvivorEngine } from './engine';
export type { SurvivorEngineOptions } from './engine';

export interface SurvivorBootResult {
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
export function createApp(options?: SurvivorEngineOptions): SurvivorBootResult {
  const { engine } = createSurvivorEngine(options);
  const { app, mount } = bootApp({ root: SurvivorAppRoot, engine });
  return { engine, app, mount };
}
