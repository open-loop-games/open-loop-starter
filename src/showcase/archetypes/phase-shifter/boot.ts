import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import PhaseShifterAppRoot from './ui/PhaseShifterAppRoot.vue';
import { createPhaseShifterEngine, type PhaseShifterEngineOptions } from './engine';

export { createPhaseShifterEngine } from './engine';
export type { PhaseShifterEngineOptions } from './engine';

export interface PhaseShifterBootResult {
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
export function createApp(options?: PhaseShifterEngineOptions): PhaseShifterBootResult {
  const { engine } = createPhaseShifterEngine(options);
  const { app, mount } = bootApp({
    root: PhaseShifterAppRoot,
    engine,
  });
  return { engine, app, mount };
}
