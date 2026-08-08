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
 * This is the behavioral counterpart to the balance layer: `balance/` probes
 * drive the engine coarsely and print economy magnitudes (see
 * `../balance/survivor-probe.ts`); this drives it tick-by-tick to *spec what the
 * mechanics do* — counts, monotonic growth, things freeing up. Magnitudes stay
 * in the balance probes; observable behavior lives here, which is why these
 * suites survive a retune. See `example.test.ts` for the shape to copy.
 */

import { type Engine } from '@open-loop/engine';
import { bootTestEngine, type TestEngineHandle } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { createSurvivorModules } from '../modules';

/**
 * Ticks per game-second. `stepOnce()` advances 1/TICK_RATE seconds of game
 * time. Set to 1 if your economy is second-valued and you want `tick(n)` to
 * mean n seconds; keep at 20 (the engine default) for fine-grained cadence.
 */
export const TICK_RATE = 20;

let handle: TestEngineHandle;

/** Build a fresh engine with the full game module stack. Use in `beforeEach`. */
export function boot(): Engine {
  handle = bootTestEngine({
    modules: [...sharedBase, ...createSurvivorModules()],
    namespacePrefix: 'survivor-test',
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
