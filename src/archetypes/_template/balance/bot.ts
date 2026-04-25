/**
 * <Archetype> balance bot — deterministic EngineModule.
 *
 * Scaffold. The bot plays the archetype under a fixed policy so the solver
 * in `solve.ts` can bisect a parameter until a beat lands on target. The
 * policy is deterministic: extra seeds confirm determinism, not correctness.
 *
 * Load-bearing invariants — the solver's `build-once + importSave`
 * iteration flow depends on all three:
 *
 * 1. **Bot is an EngineModule**, not post-`start()` wiring. Installation
 *    goes through `ctx.inject` so the bot's state sits inside the engine's
 *    namespace where `saveManager.exportSave / importSave` reach it.
 *
 * 2. **All bot accumulators use `persistent()`**. The solver reuses one
 *    engine across many bisection iterations, resetting state per iteration
 *    via `saveManager.importSave(initialBlob)`. Closure-local `let` state
 *    would leak across iterations silently and give wrong answers.
 *
 * 3. **Tick handlers are reset-safe**. After `importSave`, the next tick
 *    must pick up from the restored sim-time — no stale "last tick" memory
 *    outside persistent refs.
 *
 * Worked example: `src/archetypes/producer/balance/bot.ts`. Read it for
 * the click-taper + drain-on-dt patterns and the engine-as-oracle boot
 * shape used by the Gauss-Seidel solver.
 */

import { persistent, type Engine, type EngineModule } from 'open-loop-engine';

// TODO(fill-in): import your archetype's createEngine factory and
// Overrides type from the archetype barrel; import any driver primitives
// (e.g. setupAutoPurchaseProducers) and the injection keys the bot needs.
//
// import { create<Archetype>Engine, type <Archetype>Overrides } from '..';

/**
 * Input / activity model. Returns the cumulative count of the modeled
 * input event at `simTimeSec` — the tick handler differences per tick to
 * fire the delta.
 *
 * Activity model differs per archetype (see the archetype's .md § 4):
 *   Producer  — short click burst then taper to zero
 *   Looper    — scripted queue execution under a mana budget
 *   Defender  — between-wave placements only; zero live input during waves
 *   Survivor  — continuous movement (no discrete event; model differently)
 */
function expectedInputAt(_simTimeSec: number): number {
  // TODO(fill-in)
  return 0;
}

let engineCounter = 0;

function createBalanceBotModule(): EngineModule {
  return {
    id: 'balance-bot',
    // TODO(fill-in): declare real deps on archetype modules this bot reads.
    dependencies: [],
    install(_ctx) {
      // TODO(fill-in): inject archetype state the bot acts on.
      //   const state = ctx.inject(MyArchetypeKey);

      // Persistent accumulators. `persistent()` puts them inside the
      // engine namespace so importSave resets them.
      const _inputsFired = persistent<number>(0, { name: 'inputsFired' });

      // Pattern: onTick reads `engine.loop.elapsedSec` (or equivalent) and
      // fires (target - fired) events since last tick. Drain-while-≥-interval
      // semantics for periodic bulk actions (see producer's upgrade drain).
      //
      // ctx.onTick((dt: number) => { ... });

      // TODO(fill-in): wire the bot's per-tick behavior.
    },
  };
}

/**
 * Accessor for `eventDrivenProbe` benches and anything that drives the
 * content walker over this archetype's engine. Keyed by `resource.id`.
 * Keep this factory co-located with the bot so the solver and any profile
 * bench share one shape.
 *
 * Only needed if you plan to use `eventDrivenProbe` or the content-walker
 * harness — both are optional for a balance pass. Delete if unused.
 */
// TODO(fill-in): implement buildArchetypeAccessor(engine) → GameStateAccessor.

/**
 * Build a started, bot-driven engine for this archetype's balance solver.
 *
 * `start()` + `stop()` leaves the engine in a state where the real-time
 * interval won't fire; callers drive advancement via `runUntil` / `runProbe`
 * from the engine harness.
 *
 * Namespace trick: each build gets a unique `persistenceNamespace` so
 * parallel instances (e.g. matrix-probe seeds) don't collide in storage.
 */
export function buildSimEngine(/* overrides?, options? */): Engine {
  const _namespace = `balance-${++engineCounter}`;
  // TODO(fill-in): call create<Archetype>Engine with extraModules:
  //   [createBalanceBotModule()] and persistenceNamespace: _namespace.
  //   Then engine.start(); engine.stop(); return engine;
  throw new Error('template — replace with archetype-specific boot');
}

export { expectedInputAt };
