/**
 * Starter boot factories — the canonical entry points for every archetype.
 *
 * `bootEngine` creates an engine with starter defaults (tick rate, autosave,
 * save-slot count) and auto-prepends `sharedBase` modules to every mod.
 *
 * `bootApp` creates a Vue app and provides the engine. Pass additional
 * provides for archetype-specific keys.
 *
 * Archetype `boot.ts` files flow through these — there is no other supported
 * way to wire an engine + app. Fork at your own peril.
 *
 * Invariant: every demo's `gameId` must be unique within the gallery —
 * SaveManager keys storage by `gameId`, so collisions cross-contaminate
 * saves between sibling demos. Forks rename `gameId` when forking.
 *
 * Autosave: the engine's default applies (it writes only after a load). While
 * SystemHeader is mounted it drives the interval from the player-pref refs, so
 * the cadence is user-configurable at runtime. An engine that must never write
 * (sim, balance, test) passes `autoSaveInterval: 0`.
 *
 * Error surfacing: `bootApp` installs an `app.config.errorHandler`. Without
 * one, Vue degrades a throw inside a lifecycle hook or event handler to a
 * `[Vue warn]` with the cause swallowed — which is how engine wiring mistakes
 * reach a developer as "the app didn't render" and nothing else.
 */

import { createApp as createVueApp, type App, type Component } from 'vue';
import { createEngine, type Engine, type EngineOptions, type ModDef } from '@open-loop/engine';
import { sharedBase } from '@/modules';
import { useSaveEvents } from '@/composables/useSaveEvents';

const DEFAULT_INTERVAL_RATE = 20;
const DEFAULT_MAX_SAVE_SLOTS = 30;

export interface BootEngineOptions extends Omit<EngineOptions, 'mods'> {
  mods: ModDef[];
}

export function bootEngine(options: BootEngineOptions): Engine {
  const {
    intervalRate = DEFAULT_INTERVAL_RATE,
    maxSaveSlots = DEFAULT_MAX_SAVE_SLOTS,
    mods,
    ...rest
  } = options;

  return createEngine({
    ...rest,
    intervalRate,
    maxSaveSlots,
    mods: mods.map((mod) => ({
      ...mod,
      modules: [...sharedBase, ...mod.modules],
    })),
  });
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
  // mount is invisible. Log it whole, then rethrow in dev to surface it in the
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
  // fields, load failures, future-version refusals, migration logging.
  // Engines created without persistence (sim/test) have no saveManager;
  // skip silently.
  if (options.engine.saveManager) {
    useSaveEvents(options.engine.saveManager);
  }

  return {
    app,
    mount: (target) => app.mount(target),
  };
}
