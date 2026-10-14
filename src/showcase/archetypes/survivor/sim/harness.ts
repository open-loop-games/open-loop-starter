/**
 * Behavioral test harness: the game-facing wrapper over `bootTestEngine`. Hardcodes the
 * survivor module list so tests read as specs:
 *
 *   beforeEach(() => boot());
 *   it('…', async () => { getTake().startTake({ … }); await seconds(5); expect(…); });
 *
 * Fresh engine per `boot()`: the modules rebind their state on `install`, so a fresh boot is
 * a clean reset.
 *
 * This is the behavioral counterpart to `../balance/`. Probes there play whole takes under
 * the stars' instincts and print magnitudes; this drives the engine tick by tick to spec what
 * the mechanics do. Magnitudes stay in the probes, which is why these suites survive a retune.
 */

import { type Engine } from '@open-loop/engine';
import { bootTestEngine, type TestEngineHandle } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { INTERVAL_RATE, createSurvivorModules } from '../modules';

let handle: TestEngineHandle;

/** Build a fresh engine with the full survivor module stack. Use in `beforeEach`. */
export function boot(): Engine {
  handle = bootTestEngine({
    modules: [...sharedBase, ...createSurvivorModules()],
    persistenceNamespacePrefix: 'survivor-test',
    intervalRate: INTERVAL_RATE,
  });
  return handle.engine;
}

export function getEngine(): Engine {
  return handle.engine;
}

/** Advance n ticks, flushing reactive effects. */
export function tick(n = 1): Promise<void> {
  return handle.tick(n);
}

/** Advance n game-seconds. */
export function seconds(n: number): Promise<void> {
  return handle.tick(Math.round(n * INTERVAL_RATE));
}

/** Tick until `condition()` holds (or throw after `maxTicks`). */
export function tickUntil(condition: () => boolean, maxTicks?: number): Promise<number> {
  return handle.tickUntil(condition, maxTicks);
}
