import { type App } from 'vue';
import { type Engine } from '@open-loop/engine';
import { bootApp } from '@/boot';
import GameAppRoot from './ui/GameAppRoot.vue';
import { createGameEngine, type GameEngineOptions } from './engine';

export { createGameEngine } from './engine';
export type { GameEngineOptions } from './engine';

export interface GameBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so a host page that mounts the game can call `app.unmount()`. */
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
export function createApp(options?: GameEngineOptions): GameBootResult {
  const { engine } = createGameEngine(options);
  const { app, mount } = bootApp({
    root: GameAppRoot,
    engine,
  });
  return { engine, app, mount };
}
