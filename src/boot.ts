/**
 * Starter boot factories — the canonical entry points for every archetype.
 *
 * `bootEngine` creates an engine with starter defaults (interval rate, autosave,
 * save-slot count) and auto-prepends `sharedBase` modules to every mod. Given
 * exactly one mod, it selects it, so `start()` installs the game.
 *
 * `bootApp` creates a Vue app and provides the engine. Pass additional
 * provides for archetype-specific keys.
 *
 * Archetype `boot.ts` files flow through these — there is no other supported
 * way to wire an engine + app. Bypass them at your own peril.
 *
 * Invariant: every game's `gameId` is unique among the games served from one
 * origin. SaveManager keys storage by `gameId`, so a collision mixes two
 * games' saves. `pnpm eject --name` sets it.
 *
 * Autosave: the engine's default applies (it writes only after a load). While
 * SystemHeader is mounted it drives the interval from the player-pref refs, so
 * the cadence is user-configurable at runtime. An engine that must never write
 * (a simulation, a balance probe, a test) passes `autoSaveInterval: 0`.
 *
 * Timers: `bootEngine` schedules on `worker-timers` wherever a `Worker` exists.
 * A browser throttles a hidden tab's native `setInterval` to as little as one
 * wake a minute, and each wake simulates at most `maxDeltaTime`, so a game in a
 * background tab would run at a fraction of real time. A worker's timers are
 * not throttled. Node has no `Worker`, so tests and balance probes keep the
 * engine's native default. A caller's own `timerProvider` wins.
 *
 * Game state for Gates and effects: the engine builds its accessor at
 * `start()`, with flags from `createFlag` and rates from rate sources. Pass
 * `accessor` through, as for `createEngine`, only for state paths
 * (`{ getStateAt, setStateAt }`) or a `wrap`. A state Gate or effect without
 * them fails where it is built, naming the method. `_blank`'s flags module is
 * the worked example.
 *
 * Error reporting: `bootApp` installs an `app.config.errorHandler`. Without
 * one, Vue degrades a throw inside a lifecycle hook or event handler to a
 * `[Vue warn]` with the cause swallowed — which is how engine wiring mistakes
 * reach a developer as "the app didn't render" and nothing else.
 */

import { createApp as createVueApp, type App, type Component } from 'vue';
import {
  createEngine,
  type Engine,
  type EngineOptions,
  type ModDef,
  type TimerProvider,
} from '@open-loop/engine';
import {
  clearInterval as clearWorkerInterval,
  setInterval as setWorkerInterval,
} from 'worker-timers';
import { sharedBase } from '@/modules';
import { useSaveEvents } from '@/composables/useSaveEvents';

const DEFAULT_INTERVAL_RATE = 20;
const DEFAULT_MAX_SAVE_SLOTS = 30;
const DEFAULT_TIMER_PROVIDER: TimerProvider | undefined =
  typeof Worker === 'undefined'
    ? undefined
    : { setInterval: setWorkerInterval, clearInterval: clearWorkerInterval };

export interface BootEngineOptions extends Omit<EngineOptions, 'mods'> {
  mods: ModDef[];
}

export function bootEngine(options: BootEngineOptions): Engine {
  const {
    intervalRate = DEFAULT_INTERVAL_RATE,
    maxSaveSlots = DEFAULT_MAX_SAVE_SLOTS,
    timerProvider = DEFAULT_TIMER_PROVIDER,
    mods,
    ...rest
  } = options;

  const engine = createEngine({
    ...rest,
    intervalRate,
    maxSaveSlots,
    timerProvider,
    mods: mods.map((mod) => ({
      ...mod,
      modules: [...sharedBase, ...mod.modules],
    })),
  });
  // An unselected mod installs nothing, and start() doesn't warn. A game
  // boots one mod, so select it here: a headless script's start() then
  // installs the game, as the app's play session does.
  if (mods.length === 1) engine.selectMod(mods[0]!.id);
  return engine;
}

export interface BootAppOptions {
  root: Component;
  engine: Engine;
  /** Extra app-level provides keyed by string or symbol. Engine is auto-provided as `'engine'`. */
  provides?: Array<[string | symbol, unknown]>;
}

export interface BootAppResult {
  app: App;
  mount: (target: string | Element) => void;
}

export function bootApp(options: BootAppOptions): BootAppResult {
  const app = createVueApp(options.root);

  // Vue routes lifecycle-hook and event-handler throws here; with no handler
  // installed it logs a warn and drops the cause, so an engine throw during
  // mount is invisible. Log it whole, then rethrow in dev to show it in the
  // overlay — production keeps rendering the rest of the tree.
  app.config.errorHandler = (err, _instance, info) => {
    console.error(`[boot] unhandled error during ${info}:`, err);
    if (import.meta.env.DEV) throw err;
  };

  app.provide('engine', options.engine);
  for (const [key, value] of options.provides ?? []) {
    app.provide(key, value);
  }

  // Canonical save-event subscription — toast aggregation for self-healed
  // fields, load failures, future-version refusals, save-migration logging.
  // Engines created without persistence (simulation, test) have no saveManager;
  // skip silently.
  if (options.engine.saveManager) {
    useSaveEvents(options.engine.saveManager);
  }

  return {
    app,
    mount: (target) => app.mount(target),
  };
}
