import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { boot, tick } from '../sim/harness';
import { getFirm } from './firm';
import { getAutomation } from './automation';
import { getStanding } from './standing';

/** What achievements and standing do. Magnitudes are the spine's. */

const num = (v: unknown): number => new Decimal(v as never).toNumber();

beforeEach(() => boot());

describe('standing', () => {
  it('rises with every achievement', async () => {
    const before = getStanding().standing.value;
    addResource(getFirm().cash, 1e6);
    getFirm().subsidiaries.getProducer('pushcart')!.repeatable!.purchase(1);
    await tick(1);
    expect(getStanding().achievements.value).toBeGreaterThan(0);
    expect(getStanding().standing.value).toBeGreaterThan(before);
  });

  it('a standing upgrade lifts all income, and keeps rising with standing', async () => {
    addResource(getFirm().cash, 1e12);
    for (const e of getFirm().subsidiaries.getAll()) e.producer.repeatable!.purchase(1);
    await tick(1);
    const first = getStanding().upgrades.getAll()[0];
    expect(first.purchasable.visible.value).toBe(true);
    const before = num(getAutomation().income.value);
    first.purchasable.purchase(1);
    const bought = num(getAutomation().income.value);
    expect(bought).toBeGreaterThan(before);
    getFirm().subsidiaries.getProducer('pushcart')!.repeatable!.purchase(25);
    await tick(1);
    const perCart = num(getFirm().subsidiaries.getProducer('newsstand')!.computedRate.value);
    expect(perCart).toBeGreaterThan(0);
    expect(getStanding().standing.value).toBeGreaterThan(0.5);
  });
});
