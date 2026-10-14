/**
 * Behavioral test harness: the game-facing wrapper over `bootTestEngine`.
 * Hardcodes scaler's module list so tests read as specs:
 *
 *   beforeEach(() => boot());
 *   it('…', async () => { getPrestige().reboot(); await tick(20); expect(…); });
 *
 * Fresh engine per `boot()`: the modules rebind their state on `install`, so a
 * fresh boot is a clean reset.
 *
 * This is the behavioral counterpart to `../balance/`. Probes there run whole
 * arcs and print magnitudes; this drives the engine tick by tick to spec what the
 * mechanics do. Magnitudes stay in the probes, which is why these suites survive
 * a retune.
 */

import { type Engine } from '@open-loop/engine';
import { bootTestEngine, type TestEngineHandle } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { createScalerModules } from '../modules';

/** Intervals per game-second, passed as the engine's `intervalRate`: `tick(20)` is one second. */
export const INTERVAL_RATE = 20;

let handle: TestEngineHandle;

/** Build a fresh engine with the full scaler module stack. Use in `beforeEach`. */
export function boot(): Engine {
  handle = bootTestEngine({
    modules: [...sharedBase, ...createScalerModules()],
    persistenceNamespacePrefix: 'scaler-test',
    intervalRate: INTERVAL_RATE,
  });
  return handle.engine;
}

export function getEngine(): Engine {
  return handle.engine;
}

/** Advance n ticks (a twentieth of a second each), flushing reactive effects. */
export function tick(n = 1): Promise<void> {
  return handle.tick(n);
}

/** Tick until `condition()` holds (or throw after `maxTicks`). */
export function tickUntil(condition: () => boolean, maxTicks?: number): Promise<number> {
  return handle.tickUntil(condition, maxTicks);
}
