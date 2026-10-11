/**
 * Behavioral test harness — the game-facing wrapper over `bootTestEngine`.
 * Hardcodes producer's module list so tests read as specs:
 *
 *   beforeEach(() => boot());
 *   it('…', async () => { launch(); await tick(10); expect(…); });
 *
 * Fresh engine per `boot()` — the modules rebind their state on `install`, so a
 * fresh boot IS a clean reset and there is no per-module reset surface to keep
 * in sync.
 *
 * This is the behavioral counterpart to `../balance/`: probes there drive the
 * engine coarsely and print economy magnitudes; this drives it tick-by-tick to
 * spec what the mechanics *do*. Magnitudes stay in the probes, which is why
 * these suites survive a retune.
 */

import { type Engine } from '@open-loop/engine';
import { bootTestEngine, type TestEngineHandle } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { createProducerModules } from '../modules';
import { DEFAULT_PRODUCER_DATA } from '../data';

/**
 * Intervals per game-second, passed as the engine's `intervalRate`. `1` because
 * producer's economy is second-valued and its beats are minutes-to-hours —
 * `tick(n)` means n seconds, and sub-second fidelity would only cost cycles.
 */
export const INTERVAL_RATE = 1;

let handle: TestEngineHandle;

/** Build a fresh engine with the full producer module stack. Use in `beforeEach`. */
export function boot(): Engine {
  handle = bootTestEngine({
    modules: [...sharedBase, ...createProducerModules(DEFAULT_PRODUCER_DATA)],
    persistenceNamespacePrefix: 'producer-test',
    intervalRate: INTERVAL_RATE,
  });
  return handle.engine;
}

export function getEngine(): Engine {
  return handle.engine;
}

/** Advance n ticks (n game-seconds at INTERVAL_RATE 1), flushing reactive effects. */
export function tick(n = 1): Promise<void> {
  return handle.tick(n);
}

/** Step until `condition()` holds (or throw after `maxTicks`). */
export function tickUntil(condition: () => boolean, maxTicks?: number): Promise<number> {
  return handle.tickUntil(condition, maxTicks);
}
