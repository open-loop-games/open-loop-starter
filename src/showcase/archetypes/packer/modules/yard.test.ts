import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import { unlockGate } from '../data';
import { boot, tick } from '../sim/harness';
import { getYard } from './yard';

const num = (v: unknown) => toNumber(Decimal.fromValue(v as never));

describe('the fabricator', () => {
  beforeEach(() => boot());

  it('prices each copy of a type above the last', () => {
    const yard = getYard();
    const pulse = yard.fabricator.getPurchasable('pulse')!;
    yard.salvage.value = new Decimal(1e6);
    const first = num(pulse.getCost(1));
    expect(toNumber(pulse.purchase(1))).toBe(1);
    expect(num(pulse.getCost(1))).toBeGreaterThan(first);
  });

  it('keeps a schematic hidden and unbuyable until lifetime salvage passes its gate', async () => {
    const yard = getYard();
    const array = yard.fabricator.getPurchasable('targeting')!;
    expect(yard.unlocked('targeting')).toBe(false);
    expect(toNumber(array.purchase(1))).toBe(0);
    yard.salvage.value = new Decimal(unlockGate('unlock:targeting'));
    await tick(1);
    expect(yard.unlocked('targeting')).toBe(true);
    expect(toNumber(array.purchase(1))).toBe(1);
  });
});

describe('the hull and the refits', () => {
  beforeEach(() => boot());

  it('plates the sections in order, whatever the salvage', () => {
    const yard = getYard();
    yard.salvage.value = new Decimal(1e9);
    expect(toNumber(yard.hull.getPurchasable('section-2')!.purchase(1))).toBe(0);
    expect(toNumber(yard.hull.getPurchasable('section-1')!.purchase(1))).toBe(1);
    expect(toNumber(yard.hull.getPurchasable('section-2')!.purchase(1))).toBe(1);
    expect(yard.plated(2)).toBe(true);
  });

  it('sells each refit once', async () => {
    const yard = getYard();
    yard.salvage.value = new Decimal(1e9);
    await tick(1);
    const refit = yard.refits.getPurchasable('overcharge')!;
    expect(toNumber(refit.purchase(1))).toBe(1);
    expect(toNumber(refit.purchase(1))).toBe(0);
    expect(yard.globalMult.value).toBeGreaterThan(1);
  });
});
