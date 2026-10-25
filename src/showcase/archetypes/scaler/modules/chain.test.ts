import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { REWRITE_THRESHOLD } from '../data';
import { boot, tick, tickUntil } from '../sim/harness';
import { getCore } from './core';
import { getLegacy } from './legacy';
import { getPrestige } from './prestige';
import { getRun } from './run';

/**
 * What a layer's cascading chain does, on the Network: tier 3 makes tier-2
 * units, tier 2 makes tier-1 units, tier 1 makes Hope, and Hope multiplies the
 * corps. What the chain made goes with a Reboot; what was bought goes with a
 * Rewrite. The Earths and the Imprints are the same wiring one and two layers up.
 */

const num = (v: unknown): number => new Decimal(v as never).toNumber();
const unit = (id: string) => getLegacy().network.getProducer(id)!;
const buy = (id: string) => unit(id).purchasable!.purchase(1);

beforeEach(() => {
  boot();
  getLegacy().bank(1e6);
});

describe('the Network', () => {
  it('makes no Hope until an Informant is bought', async () => {
    await tick(20);
    expect(num(getRun().hope.value)).toBe(0);
    buy('informant');
    await tick(20);
    expect(num(getRun().hope.value)).toBeGreaterThan(0);
  });

  it('cascades: Watchtowers make Safehouses, Safehouses make Informants', async () => {
    buy('watchtower');
    await tick(20);
    expect(num(unit('safehouse').count.value)).toBeGreaterThan(0);
    expect(num(unit('safehouse').ownedCount.value)).toBe(0);
    await tick(20);
    expect(num(unit('informant').count.value)).toBeGreaterThan(0);
    expect(num(getRun().hope.value)).toBeGreaterThan(0);
  });

  it('multiplies every hero by its Hope', async () => {
    const before = num(getCore().output.apply(1));
    buy('informant');
    await tick(20);
    expect(num(getCore().output.apply(1))).toBeGreaterThan(before);
  });

  it('loses what it made at a Reboot but keeps what was bought', async () => {
    buy('watchtower');
    await tick(40);
    addResource(getRun().justice, 1e15);
    getRun().heroes.getProducer('bastion')!.purchasable!.purchase(10);
    await tickUntil(() => Decimal.gte(getPrestige().pendingLegacy.value, 1), 20 * 600);
    getPrestige().reboot();
    expect(num(getRun().hope.value)).toBe(0);
    expect(num(unit('safehouse').count.value)).toBe(0);
    expect(num(unit('watchtower').ownedCount.value)).toBe(1);
  });

  it('loses what was bought at a Rewrite', () => {
    buy('watchtower');
    getLegacy().bank(REWRITE_THRESHOLD);
    getPrestige().rewrite();
    expect(num(unit('watchtower').ownedCount.value)).toBe(0);
  });
});
