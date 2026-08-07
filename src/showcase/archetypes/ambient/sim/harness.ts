/**
 * Behavioral test harness — the game-facing wrapper over `bootTestEngine`.
 * Hardcodes ambient's module list so tests read as specs:
 *
 *   beforeEach(() => boot());
 *   it('…', async () => { await tick(60); expect(…); });
 *
 * Fresh engine per `boot()` (call it in `beforeEach`) — the modules rebind their
 * state on `install` and each boot gets its own persistence namespace, so a
 * fresh boot IS a clean reset. Ambient's module-scope getters
 * (`getPrimaryResource`, `getAutoProducers`) resolve against the most recent
 * install, so one live engine at a time is the contract.
 *
 * This is the behavioral counterpart to the balance layer: `balance/` probes
 * drive the engine coarsely and print economy magnitudes (`solve-probe.ts`,
 * `invariant-probe.ts`, `reveal-probe.ts`); this drives it tick-by-tick to
 * *spec what the mechanics do* — a gate holding, a reveal firing, a rate
 * rising. Magnitudes stay in the probes, which is why these suites survive a
 * retune.
 *
 * `balance/bot.ts`'s `buildAmbientSimEngine` is a different thing and not a
 * duplicate of this: it builds the probe-side engine plus the zero-click
 * activity model the solver measures against.
 */

import { type Engine } from '@open-loop/engine';
import { bootTestEngine, type TestEngineHandle } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { DEFAULT_AMBIENT_DATA } from '../data';
import { createAmbientModules } from '../modules';

/**
 * Ticks per game-second. Ambient's arc is measured in minutes and hours, but
 * its autobuyer interval is second-valued, so 20Hz keeps cadence-sensitive
 * behavior observable without special-casing.
 */
export const TICK_RATE = 20;

let handle: TestEngineHandle;

/** Build a fresh engine with the full ambient module stack. Use in `beforeEach`. */
export function boot(): Engine {
  handle = bootTestEngine({
    modules: [...sharedBase, ...createAmbientModules(DEFAULT_AMBIENT_DATA)],
    namespacePrefix: 'ambient-test',
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
