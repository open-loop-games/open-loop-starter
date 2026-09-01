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
 * Autosave: engine-side autosave is off by default (interval 0). The
 * starter drives autosave from the player-pref refs via SystemHeader's
 * runtime, so the cadence is user-configurable at runtime.
 *
 * Error surfacing: `bootApp` installs an `app.config.errorHandler`. Without
 * one, Vue degrades a throw inside a lifecycle hook or event handler to a
 * `[Vue warn]` with the cause swallowed — which is how engine wiring mistakes
 * reach a developer as "the app didn't render" and nothing else.
 */

import { createApp as createVueApp, type App, type Component } from 'vue';
import { createEngine, type Engine, type EngineConfig, type ModDef } from '@open-loop/engine';
import { sharedBase } from '@/modules';
import { useSaveEvents } from '@/composables/useSaveEvents';

const DEFAULT_TICK_RATE = 20;
const DEFAULT_AUTOSAVE_MS = 0;
const DEFAULT_MAX_SAVE_SLOTS = 30;

export interface BootEngineOptions extends Omit<EngineConfig, 'mods'> {
  mods: ModDef[];
}

export function bootEngine(options: BootEngineOptions): Engine {
  const {
    tickRate = DEFAULT_TICK_RATE,
    autoSaveInterval = DEFAULT_AUTOSAVE_MS,
    maxSaveSlots = DEFAULT_MAX_SAVE_SLOTS,
    mods,
    ...rest
  } = options;

  return createEngine({
    ...rest,
    tickRate,
    autoSaveInterval,
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
