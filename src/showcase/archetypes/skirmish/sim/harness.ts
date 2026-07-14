/**
 * Behavioral test harness — the game-facing wrapper over `bootTestEngine`.
 * Hardcodes this game's module list so tests read as specs:
 *
 *   beforeEach(() => boot());
 *   it('…', async () => { doSomething(); await tick(10); expect(…); });
 *
 * Fresh engine per `boot()` (call it in `beforeEach`) — the game modules rebind
 * their state on `install`, so a fresh boot IS a clean reset, no per-module
 * reset surface to keep in sync. Cheap; revisit only if boot cost ever bites.
 *
 * This is the behavioral counterpart to the balance layer: `balance/`+`sim/`
 * probes drive the engine coarsely to *lock economy magnitudes* (see
 * `game.probe.test.ts` for the Lane-3 lock shape); this drives it tick-by-tick
 * to *spec what the mechanics do* — counts, monotonic growth, things freeing up.
 * Keep absolute-number locks in the balance probes; keep observable behavior
 * here. See `example.test.ts` for the behavioral shape to copy.
 */

import { type Engine, type EngineModule } from '@open-loop/engine';
import { bootTestEngine, type TestEngineHandle } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { createSkirmishModules } from '../modules';

/**
 * Ticks per game-second. `stepOnce()` advances 1/TICK_RATE seconds of game
 * time. Set to 1 if your economy is second-valued and you want `tick(n)` to
 * mean n seconds; keep at 20 (the engine default) for fine-grained cadence.
 */
export const TICK_RATE = 20;

let handle: TestEngineHandle;

/** Build a fresh engine with the full game module stack. Use in `beforeEach`. */
export function boot(): Engine {
  return bootModules(createSkirmishModules());
}

/**
 * Build a fresh engine with an arbitrary module list (over the shared base) —
 * for mechanics tests that isolate the sim from the AI policies (drive `spawn`
 * by hand instead of letting automation churn the field).
 */
export function bootModules(modules: EngineModule[]): Engine {
  handle = bootTestEngine({
    modules: [...sharedBase, ...modules],
    namespacePrefix: 'skirmish-test',
    tickRate: TICK_RATE,
  });
  return handle.engine;
}

export function getEngine(): Engine {
  return handle.engine;
}

/** Advance n ticks (n/TICK_RATE game-seconds), flushing reactive effects. */
export function tick(n = 1): Promise<void> {
  return handle.tick(n);
}

/** Step until `condition()` holds (or throw after `maxTicks`). */
export function tickUntil(condition: () => boolean, maxTicks?: number): Promise<number> {
  return handle.tickUntil(condition, maxTicks);
}
