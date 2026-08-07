import { describe, it, expect, beforeEach } from 'vitest';
import { boot, getEngine, tick, TICK_RATE } from '../sim/harness';
import {
  AutobuyerMasterToggleKey,
  AutobuyerRegistryKey,
  AutomationTiersKey,
  getAutoProducers,
  getPrimaryResource,
} from '.';

/**
 * The automation gate: tier reached, master on, spec toggled on. Three
 * independent conditions, and the buy loop runs only when all three hold.
 *
 * No magnitudes — how *much* the autobuyer buys is a balance question the
 * probes print. What is asserted here is which combinations let it act at all,
 * which stays true across any retune.
 */

beforeEach(() => boot());

function tiers() {
  return getEngine().tryInject(AutomationTiersKey)!;
}
function master() {
  return getEngine().tryInject(AutobuyerMasterToggleKey)!;
}
function producerSpec() {
  return getEngine()
    .tryInject(AutobuyerRegistryKey)!
    .find((s) => s.groupId === 'producers')!;
}

/** Total producers owned across the ladder — what the autobuyer moves. */
function producersOwned(): number {
  return getAutoProducers()
    .getAll()
    .reduce((sum, entry) => sum + Number(entry.producer.count.value), 0);
}

/** Enough sprouts that affordability is never what blocks a purchase. */
function fund(): void {
  getPrimaryResource().value = 1e9;
}

describe('ambient autobuyer gate', () => {
  it('registers the producer autobuyer against the basic tier', () => {
    expect(producerSpec().tier).toBe('basic');
  });

  it('ships with the master and the spec both off', () => {
    expect(master().value).toBe(false);
    expect(producerSpec().isActive.value).toBe(false);
  });

  it('buys nothing while the master is off, however long it runs', async () => {
    fund();
    producerSpec().isActive.value = true;
    const before = producersOwned();

    await tick(10 * TICK_RATE);

    expect(producersOwned()).toBe(before);
  });

  it('buys nothing while the spec toggle is off', async () => {
    fund();
    master().value = true;
    const before = producersOwned();

    await tick(10 * TICK_RATE);

    expect(producersOwned()).toBe(before);
  });

  it('buys once tier, master and toggle all hold', async () => {
    fund();
    master().value = true;
    producerSpec().isActive.value = true;
    const before = producersOwned();

    await tick(10 * TICK_RATE);

    expect(producersOwned()).toBeGreaterThan(before);
  });

  it('stops buying again the moment the master goes back off', async () => {
    fund();
    master().value = true;
    producerSpec().isActive.value = true;
    await tick(10 * TICK_RATE);
    const afterRunning = producersOwned();
    expect(afterRunning).toBeGreaterThan(0);

    master().value = false;
    await tick(10 * TICK_RATE);

    expect(producersOwned()).toBe(afterRunning);
  });
});

describe('ambient automation ladder', () => {
  it('has basic unlocked — the ladder ships open, deliberately', () => {
    // Recorded in BALANCING.md § Known thin: the honest rung is the coop
    // reveal, and setting it there moves the arc. This asserts the CURRENT
    // documented position, so closing the gate turns this red on purpose and
    // whoever does it has to come here and say what the new rung is.
    expect(tiers().hasReached('basic')).toBe(true);
  });
});
