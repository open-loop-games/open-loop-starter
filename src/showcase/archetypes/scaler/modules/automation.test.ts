import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource, selectionHybridPayback, type Producer } from '@open-loop/engine';
import { LEVERS, REWRITE_THRESHOLD } from '../data';
import { boot, tick, tickUntil } from '../sim/harness';
import { getAutomation, recruitHeroes, shouldReboot, shouldRewrite } from './automation';
import { getCanon } from './canon';
import { getContinuity } from './continuity';
import { getCore } from './core';
import { getLegacy } from './legacy';
import { getPrestige } from './prestige';
import { getRun } from './run';

/** What the automation ladder does: each policy is inert until its tier is reached and its piece owned. */

const num = (v: unknown): number => new Decimal(v as never).toNumber();
const corps = () =>
  getRun()
    .heroes.getAll()
    .reduce((n, e) => n + num(e.producer.ownedCount.value), 0);
/** Heroes earning enough that a Reboot is pending within seconds. */
function strongCorps() {
  addResource(getRun().justice, 1e30);
  getRun().heroes.getProducer('bastion')!.purchasable!.purchase();
}

beforeEach(() => boot());

describe('the Dispatch Desk', () => {
  it('recruits nothing until it is bought', async () => {
    addResource(getRun().justice, 1e6);
    await tick(20);
    expect(corps()).toBe(0);
  });

  it('recruits once bought, and only while on duty', async () => {
    getLegacy().bank(1);
    getLegacy().upgrade('dispatch').purchase(1);
    getAutomation().dispatchOn.value = false;
    addResource(getRun().justice, 1e6);
    await tick(20);
    expect(corps()).toBe(0);
    getAutomation().dispatchOn.value = true;
    await tick(1);
    expect(corps()).toBeGreaterThan(0);
  });

  it.each([1e9, 1e15, 1e40])(
    'recruits from %d Justice what one recruit at a time would',
    (justice) => {
      const recruit = (one: boolean) => {
        boot();
        addResource(getRun().justice, justice);
        const heroes = getRun()
          .heroes.getAll()
          .map((e) => e.producer);
        const income = () => getRun().totalRate.value;
        if (one) {
          const policy = selectionHybridPayback<Producer>({
            getCost: (p) => p.purchasable!.getCost(1),
            getRate: (p) => p.computedRate.value,
            getAmount: (p) => p.resource.value,
            getReserve: () => 0,
            getTotalRate: income,
          });
          for (let n = 0; n < 500; n++) {
            const best = policy.pick(heroes);
            if (!best?.purchasable!.canPurchase.value) break;
            best.purchasable!.purchase(1);
          }
        } else {
          recruitHeroes(heroes, income, getRun().priceRatio.value, 500);
        }
        return heroes.map((p) => num(p.ownedCount.value));
      };
      expect(recruit(false)).toEqual(recruit(true));
    },
  );

  it('stops when a Rewrite takes it, even with the Succession Plan owned', async () => {
    getLegacy().bank(1);
    getLegacy().upgrade('dispatch').purchase(1);
    getContinuity().bank(1);
    getContinuity().upgrade('succession').purchase(1);
    getLegacy().bank(REWRITE_THRESHOLD);
    getPrestige().rewrite();
    addResource(getRun().justice, 1e6);
    await tick(20);
    expect(corps()).toBe(0);
  });
});

describe('the Succession Plan', () => {
  it('reboots on its own once bought, no sooner than its interval', async () => {
    getContinuity().bank(1);
    getContinuity().upgrade('succession').purchase(1);
    strongCorps();
    await tickUntil(() => Decimal.gte(getPrestige().pendingLegacy.value, 1), 20 * 10);
    expect(getCore().reboots.value).toBe(0);
    await tickUntil(() => getCore().reboots.value === 1, 20 * (LEVERS.successionIntervalS + 1));
    expect(getRun().runSeconds.value).toBeLessThan(1);
  });

  it('reboots sooner once drilled', () => {
    getContinuity().bank(1e3);
    getContinuity().upgrade('succession').purchase(1);
    const before = getAutomation().rebootInterval();
    getContinuity().upgrade('drill').purchase(1);
    expect(getAutomation().rebootInterval()).toBeLessThan(before);
  });

  it('never forfeits an Elseworld in progress', () => {
    const state = { pendingLegacy: 10, legacyEarned: 1, inElseworld: true, runSeconds: 60 };
    expect(shouldReboot(state, { share: 0, interval: 0 })).toBe(false);
    expect(shouldReboot({ ...state, inElseworld: false }, { share: 0, interval: 0 })).toBe(true);
  });

  it('waits for its share of Legacy earned and its interval', () => {
    const state = { pendingLegacy: 4, legacyEarned: 10, inElseworld: false, runSeconds: 60 };
    expect(shouldReboot(state, { share: 0.5, interval: 0 })).toBe(false);
    expect(shouldReboot({ ...state, pendingLegacy: 5 }, { share: 0.5, interval: 0 })).toBe(true);
    expect(shouldReboot({ ...state, pendingLegacy: 5 }, { share: 0.5, interval: 90 })).toBe(false);
  });
});

describe('the Network Liaison', () => {
  it('spends Legacy once bought', async () => {
    getLegacy().bank(100);
    await tick(1);
    expect(num(getLegacy().legacy.value)).toBe(100);
    getContinuity().bank(10);
    getContinuity().upgrade('liaison').purchase(1);
    await tick(1);
    expect(num(getLegacy().legacy.value)).toBeLessThan(100);
    expect(getLegacy().upgrade('public-trust').active.value).toBe(true);
  });
});

describe('the Crossover Event', () => {
  it('rewrites on its own once bought', async () => {
    getCanon().canon.value = 100;
    getCanon().upgrade('crossover').purchase(1);
    getLegacy().bank(REWRITE_THRESHOLD);
    await tick(1);
    expect(getCore().rewrites.value).toBe(1);
  });

  it('waits for its share of Continuity earned and never forfeits an Elseworld', () => {
    const state = { pendingContinuity: 4, continuityEarned: 10, inElseworld: false };
    expect(shouldRewrite(state, { share: 0.5 })).toBe(false);
    expect(shouldRewrite({ ...state, pendingContinuity: 5 }, { share: 0.5 })).toBe(true);
    expect(
      shouldRewrite({ ...state, pendingContinuity: 5, inElseworld: true }, { share: 0.5 }),
    ).toBe(false);
  });
});

describe('the Monitor', () => {
  it('spends Continuity once bought', async () => {
    getContinuity().bank(100);
    await tick(1);
    expect(num(getContinuity().continuity.value)).toBe(100);
    getCanon().canon.value = 100;
    getCanon().upgrade('monitor').purchase(1);
    await tick(1);
    expect(num(getContinuity().continuity.value)).toBeLessThan(100);
  });
});

describe('Turning the Age', () => {
  it('is never automated', async () => {
    getCanon().canon.value = 100;
    getCanon().upgrade('crossover').purchase(1);
    getCanon().upgrade('monitor').purchase(1);
    getContinuity().bank(1e30);
    await tick(20);
    expect(num(getPrestige().pendingCanon.value)).toBeGreaterThan(0);
    expect(getCore().ages.value).toBe(0);
  });
});
