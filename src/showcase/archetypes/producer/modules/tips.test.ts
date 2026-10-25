import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { boot, tick, tickUntil } from '../sim/harness';
import { getFirm } from './firm';
import { getAutomation } from './automation';
import { getTips } from './tips';

/**
 * What a tip on the wire does. No magnitudes: what tips are worth is the spine's
 * question, and `../balance/arc-probe.ts` measures it.
 */

const num = (v: unknown): number => new Decimal(v as never).toNumber();
const income = () => num(getAutomation().income.value);

/** Own a few pushcarts, so the firm has an income for tips to act on. */
function openTheFirm(): void {
  addResource(getFirm().cash, 1e6);
  getFirm().subsidiaries.getProducer('pushcart')!.purchasable!.purchase(10);
}

/** Wait for a tip, then catch it until it draws `effect`. */
async function catchUntil(effect: string): Promise<void> {
  for (let i = 0; i < 50; i++) {
    await tickUntil(() => getTips().current.value !== null, 4 * 3600 * 4);
    if (getTips().catchTip() === effect) return;
  }
  throw new Error(`no ${effect} in 50 tips`);
}

beforeEach(() => boot());

describe('tips', () => {
  it('come in on their own, and go if nobody catches them', async () => {
    await tickUntil(() => getTips().current.value !== null, 4 * 3600 * 4);
    await tickUntil(() => getTips().current.value === null, 4 * 120);
    expect(getTips().caught.value).toBe(0);
  });

  it('caught, count toward tips caught', async () => {
    await tickUntil(() => getTips().current.value !== null, 4 * 3600 * 4);
    expect(getTips().catchTip()).not.toBeNull();
    expect(getTips().caught.value).toBe(1);
    expect(getTips().current.value).toBeNull();
  });

  it('a bull market lifts every subsidiary while it lasts', async () => {
    openTheFirm();
    const before = income();
    await catchUntil('bull');
    expect(income()).toBeGreaterThan(before);
    await tickUntil(() => !getTips().effects.isActive('bull').value, 4 * 600);
    expect(income()).toBeCloseTo(before);
  });

  it('a closing spree lifts deals by hand', async () => {
    const before = num(getFirm().dealValue.value);
    await catchUntil('spree');
    expect(num(getFirm().dealValue.value)).toBeGreaterThan(before);
  });

  it('a windfall deal pays more on a bigger bank', async () => {
    openTheFirm();
    addResource(getFirm().cash, 1e3);
    await tick(4);
    const before = num(getFirm().cash.value);
    await catchUntil('windfall');
    expect(num(getFirm().cash.value)).toBeGreaterThan(before);
  });
});
