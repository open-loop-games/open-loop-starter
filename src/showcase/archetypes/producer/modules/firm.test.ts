import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { boot, tick } from '../sim/harness';
import { getFirm } from './firm';

/**
 * What the firm's mechanics do. No magnitudes: how fast the ladder climbs is the
 * spine's question, and `../balance/arc-probe.ts` measures it.
 */

const num = (v: unknown): number => new Decimal(v as never).toNumber();
const owned = (id: string): number => num(getFirm().subsidiaries.getProducer(id)!.ownedCount.value);
const fund = (amount: number) => addResource(getFirm().cash, amount);

beforeEach(() => boot());

describe('the deal', () => {
  it('pays cash by hand', () => {
    getFirm().deal();
    expect(num(getFirm().cash.value)).toBeGreaterThan(0);
  });
});

describe('subsidiaries', () => {
  it('earn cash every second once owned', async () => {
    fund(1e6);
    getFirm().subsidiaries.getProducer('pushcart')!.repeatable!.purchase(1);
    const before = num(getFirm().cash.value);
    await tick(4);
    expect(num(getFirm().cash.value)).toBeGreaterThan(before);
  });

  it('cost more with every one owned', () => {
    const cart = getFirm().subsidiaries.getProducer('pushcart')!.repeatable!;
    const first = num(cart.getCost(1));
    fund(1e6);
    cart.purchase(1);
    expect(num(cart.getCost(1))).toBeGreaterThan(first);
  });

  it('open one tier at a time: owning one of a tier reveals the next', () => {
    const stands = getFirm().subsidiaries.getProducer('newsstand')!.repeatable!;
    expect(stands.visible.value).toBe(false);
    fund(1e6);
    getFirm().subsidiaries.getProducer('pushcart')!.repeatable!.purchase(1);
    expect(stands.visible.value).toBe(true);
  });
});

describe('the stack', () => {
  it('a memo multiplies the subsidiary it names', () => {
    fund(1e9);
    const carts = getFirm().subsidiaries.getProducer('pushcart')!;
    carts.repeatable!.purchase(10);
    const before = num(carts.computedRate.value);
    getFirm().management.getPurchasable('pushcart-upgrade-1')!.purchase(1);
    expect(num(carts.computedRate.value)).toBeGreaterThan(before);
  });

  it('a market-leader milestone lands on its owned count', async () => {
    fund(1e12);
    getFirm().subsidiaries.getProducer('pushcart')!.repeatable!.purchase(25);
    await tick(1);
    expect(owned('pushcart')).toBe(25);
    expect(getFirm().milestones.getAchievement('pushcart-25')!.earned.value).toBe(true);
  });

  it('a credit grade lands on lifetime revenue and lifts every subsidiary', async () => {
    fund(1e6);
    await tick(1);
    expect(getFirm().grades.getAchievement('grade-B')!.earned.value).toBe(true);
  });
});
