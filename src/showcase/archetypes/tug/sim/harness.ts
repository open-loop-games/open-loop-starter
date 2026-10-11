/**
 * Behavioral test harness — the game-facing wrapper over `bootTestEngine`.
 * Hardcodes tug's module list so tests read as specs:
 *
 *   beforeEach(() => boot());
 *   it('…', async () => { match().start(); await tick(10); expect(…); });
 *
 * Fresh engine per `boot()` (call it in `beforeEach`) — the modules rebind their
 * state on `install` and each boot gets its own persistence namespace, so a
 * fresh boot IS a clean reset. That matters more here than in a single-scope
 * game: tug's module-scope getters (`getIncome`, `getUnits`) resolve against
 * the most recent install, so two live engines in one test would alias.
 *
 * This is the behavioral counterpart to the balance layer: `balance/` probes
 * drive the engine coarsely and print economy magnitudes (`arc-probe.ts`,
 * `roi-probe.ts`); this drives it tick-by-tick to *spec what the mechanics do*
 * — reset scope, event ordering, both sides firing. Magnitudes stay in the
 * probes, which is why these suites survive a retune.
 *
 * `balance/_engine.ts`'s `buildTugSimEngine` is a different thing and not a
 * duplicate of this: it builds the bilateral bot-driven engine the probes
 * measure, and `instrumentation.test.ts` imports it deliberately because that
 * measurement path is what the suite specs.
 */

import { type Engine } from '@open-loop/engine';
import { bootTestEngine, type TestEngineHandle } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { DEFAULT_TUG_DATA } from '../data';
import { createTugModules, type TugModulesOptions } from '../modules';

/**
 * Intervals per game-second, passed as the engine's `intervalRate`. Tug's
 * cadences are second-valued (bot decision intervals, match clock), and 20Hz is
 * what the shipping loop runs, so beat timings measured here line up with the
 * probes.
 */
export const INTERVAL_RATE = 20;

let handle: TestEngineHandle;

/** Build a fresh engine with the full tug module stack. Use in `beforeEach`. */
export function boot(options?: TugModulesOptions): Engine {
  handle = bootTestEngine({
    modules: [...sharedBase, ...createTugModules(DEFAULT_TUG_DATA, options)],
    persistenceNamespacePrefix: 'tug-test',
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
