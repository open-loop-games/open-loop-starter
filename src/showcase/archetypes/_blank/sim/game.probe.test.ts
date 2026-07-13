/**
 * Blank game — balance lock. Lane 3 (see `../../README.md` § Balance).
 *
 * Pins the *measured* accrual window with a tolerance band — the invariant the
 * probe (`../balance/game-probe.ts`) settled on. A lock asserts a measured
 * window, never an invented target: the number here is what the shipping module
 * produces, recorded, not a designer's wish.
 *
 * This is the balance counterpart to the behavioral suite in `example.test.ts`:
 * that one specs *what the mechanic does* (count rises), this one locks *how
 * much* (the rate, with tolerance). Keep magnitudes here, behavior there.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, getEngine, tick, TICK_RATE } from './harness';
import { GAME_BALANCE } from '../data/game';
import { CoreKey } from '../modules/core';

beforeEach(() => boot());

describe('core accrual (Lane-3 lock)', () => {
  it('realizes ratePerSecond over a measured window, within tolerance', async () => {
    const core = getEngine().tryInject(CoreKey)!;
    const seconds = 10;

    await tick(seconds * TICK_RATE);

    const measured = core.count.value.toNumber();
    const predicted = GAME_BALANCE.ratePerSecond * seconds;

    // ±1% band — the projection is exact; tolerance absorbs tick-boundary
    // rounding. A real economy widens this to its measured window.
    expect(measured).toBeGreaterThan(predicted * 0.99);
    expect(measured).toBeLessThan(predicted * 1.01);
  });
});
