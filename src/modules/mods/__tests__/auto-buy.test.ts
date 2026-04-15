/**
 * Auto-buy wiring exercise — OL-426 coverage for the new player-facing
 * automation toggles. Complements time-to-beat.test.ts (static math)
 * by actually flipping `autoBuyProducers` / `autoBuyUpgrades` on and
 * watching the engine mutate state through `setupAutoPurchaseProducers`
 * and `setupAutoPurchase`. If either wiring breaks silently (disposer
 * fires, tick callback unregistered, wrong resource), these cases fail.
 *
 * Lives in its own file for the same reason time-to-beat.cc.test.ts
 * does: persistent contexts are process-global, so each vitest worker
 * only boots one fixture.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Decimal } from 'open-loop-engine';
import { bootCF, reset, tick, tickUntil } from '@/test/harness';
import type { CookieFactoryState } from '@/modules/mods/cookie-factory';

describe('CF auto-buy wiring', () => {
  let state: CookieFactoryState;

  beforeAll(() => {
    state = bootCF();
  });

  beforeEach(() => {
    reset(state);
  });

  it('auto-buys producers when the toggle is on and affordable', async () => {
    // Seed enough cookies to buy several cheapest producers outright.
    state.cookies.value = Decimal.fromNumber(1000);
    const ovenMitt = state.producers.getEntry('oven-mitt')!.producer;
    expect(Number(ovenMitt.count.value)).toBe(0);

    state.autoBuyProducers.value = true;
    // Tick until at least a few buys land. Each tick runs the auto-buy
    // callback once; the cheapest-affordable policy buys one producer
    // per tick at the default bulkAmount=1.
    await tickUntil(() => Decimal.gte(ovenMitt.count.value, 5), 100);

    expect(Number(ovenMitt.count.value)).toBeGreaterThanOrEqual(5);
    // Cookies drained by the purchases (not all spent — cheapest policy
    // doesn't grind the resource to zero in one tick).
    expect(Decimal.lt(state.cookies.value, 1000)).toBe(true);
  });

  it('leaves state alone when the producer toggle is off', async () => {
    state.cookies.value = Decimal.fromNumber(1000);
    state.autoBuyProducers.value = false;
    const ovenMitt = state.producers.getEntry('oven-mitt')!.producer;

    await tick(50);

    expect(Number(ovenMitt.count.value)).toBe(0);
    // Cookies unchanged (no producers means no production either).
    expect(Number(state.cookies.value)).toBe(1000);
  });

  it('auto-buys upgrades when the toggle is on and affordable', async () => {
    // Sharper Mitt is the cheapest upgrade at baseCost=100.
    state.cookies.value = Decimal.fromNumber(10_000);
    const sharperMitt = state.upgrades.find((u) => u.id === 'sharper-mitt')!;
    expect(Number(sharperMitt.amount.value)).toBe(0);

    state.autoBuyUpgrades.value = true;
    await tickUntil(() => Decimal.gte(sharperMitt.amount.value, 1), 100);

    expect(Number(sharperMitt.amount.value)).toBeGreaterThanOrEqual(1);
    expect(Decimal.lt(state.cookies.value, 10_000)).toBe(true);
  });

  it('leaves upgrades alone when the upgrade toggle is off', async () => {
    state.cookies.value = Decimal.fromNumber(10_000);
    state.autoBuyUpgrades.value = false;
    const sharperMitt = state.upgrades.find((u) => u.id === 'sharper-mitt')!;

    await tick(50);

    expect(Number(sharperMitt.amount.value)).toBe(0);
  });
});
