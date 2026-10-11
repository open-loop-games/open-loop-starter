import { type App } from 'vue';
import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootApp, bootEngine } from '@/boot';
import SkirmishAppRoot from './ui/SkirmishAppRoot.vue';
import { createSkirmishModules, type SkirmishModulesOptions } from './modules';
import { DEFAULT_TRIAD_FACTIONS } from './data/tactical';
const GAME_ID = 'skirmish';
const MOD_ID = 'skirmish';
const MOD_NAME = 'Skirmish';

export interface GameBootResult {
  engine: Engine;
  /** Underlying Vue app — exposed so sandbox / gallery hosts can call `app.unmount()`. */
  app: App;
  mount: (selector: string | Element) => void;
}

export interface GameEngineOptions {
  /** Persistence namespace override. Unique per-engine; used to isolate sim runs. */
  persistenceNamespace?: string;
  /** Extra modules registered alongside the default game modules. */
  extraModules?: EngineModule[];
  /** Raise the loop's `maxDeltaTime` cap. */
  maxDeltaTime?: number;
  /** Autosave period in ms; sim engines pass 0 so they never write. */
  autoSaveInterval?: number;
  /** Roster of participating factions. */
  factions?: SkirmishModulesOptions['factions'];
  /**
   * Per-seat policy overrides. The balance layer varies `economyShare` across
   * seats to sweep the split axis; production takes the defaults.
   */
  seats?: SkirmishModulesOptions['seats'];
  /** Per-seat named persona presets. */
  personas?: SkirmishModulesOptions['personas'];
  /** Base placement radius. */
  baseRadius?: number;
}

/**
 * Create an engine instance pre-wired with the game modules.
 * Does NOT call `engine.load()` — `GameAppRoot.vue::startGame` owns the
 * resume sequence.
 */
export function createGameEngine(options?: GameEngineOptions): { engine: Engine } {
  const factions = options?.factions ?? DEFAULT_TRIAD_FACTIONS;
  const modules = [
    ...createSkirmishModules({
      factions,
      seats: options?.seats,
      personas: options?.personas,
      baseRadius: options?.baseRadius,
    }),
    ...(options?.extraModules ?? []),
  ];
  const engine = bootEngine({
    gameId: GAME_ID,
    persistenceNamespace: options?.persistenceNamespace,
    maxDeltaTime: options?.maxDeltaTime,
    autoSaveInterval: options?.autoSaveInterval,
    mods: [
      {
        id: MOD_ID,
        displayName: MOD_NAME,
        modules,
      },
    ],
  });
  return { engine };
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
    root: SkirmishAppRoot,
    engine,
  });
  return { engine, app, mount };
}
