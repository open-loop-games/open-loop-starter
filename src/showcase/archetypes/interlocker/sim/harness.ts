/**
 * Behavioral test harness — the game-facing wrapper over `bootTestEngine`.
 * Hardcodes the interlocker module list so tests read as specs:
 *
 *   beforeEach(() => boot());
 *   it('…', async () => { doSomething(); await tick(10); expect(…); });
 *
 * A fresh engine per `boot()` is a clean reset: the modules rebind their state
 * on `install`. Magnitudes stay in `../balance/`; observable behavior is
 * specced here, so these suites survive a retune.
 */

import { type Engine } from '@open-loop/engine';
import { bootTestEngine, type TestEngineHandle } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { createInterlockerModules } from '../modules';

/** Intervals per game-second, passed as the engine's `intervalRate`. */
export const INTERVAL_RATE = 20;

let handle: TestEngineHandle;

/** Build a fresh engine with the full game module stack. Use in `beforeEach`. */
export function boot(): Engine {
  handle = bootTestEngine({
    modules: [...sharedBase, ...createInterlockerModules()],
    persistenceNamespacePrefix: 'interlocker-test',
    intervalRate: INTERVAL_RATE,
  });
  return handle.engine;
}

export function getEngine(): Engine {
  return handle.engine;
}

/** Advance n ticks (n/INTERVAL_RATE game-seconds), flushing reactive effects. */
export function tick(n = 1): Promise<void> {
  return handle.tick(n);
}

/** Step until `condition()` holds (or throw after `maxTicks`). */
export function tickUntil(condition: () => boolean, maxTicks?: number): Promise<number> {
  return handle.tickUntil(condition, maxTicks);
}
