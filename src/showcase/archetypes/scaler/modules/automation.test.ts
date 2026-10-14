import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { REBOOT_THRESHOLD } from '../data';
import { boot, tick } from '../sim/harness';
import { getAutomation, shouldReboot } from './automation';
import { getContinuity } from './continuity';
import { getCore } from './core';
import { getLegacy } from './legacy';
import { getRun } from './run';

/** What the automation ladder does: each policy is inert until its tier is reached. */

const num = (v: unknown): number => new Decimal(v as never).toNumber();
const corps = () =>
  getRun()
    .heroes.getAll()
    .reduce((n, e) => n + num(e.producer.ownedCount.value), 0);

beforeEach(() => boot());

describe('the Dispatch Desk', () => {
  it('recruits nothing until it is bought', async () => {
    addResource(getRun().justice, 1e6);
    await tick(20);
    expect(corps()).toBe(0);
  });

  it('recruits once bought, and only while on duty', async () => {
    addResource(getLegacy().legacy, 1);
    getLegacy().upgrade('dispatch').purchase(1);
    getAutomation().dispatchOn.value = false;
    addResource(getRun().justice, 1e6);
    await tick(20);
    expect(corps()).toBe(0);
    getAutomation().dispatchOn.value = true;
    await tick(1);
    expect(corps()).toBeGreaterThan(0);
  });
});

describe('the Succession Plan', () => {
  it('reboots on its own once bought', async () => {
    addResource(getContinuity().continuity, 1);
    getContinuity().upgrade('auto-reboot').purchase(1);
    addResource(getRun().justice, REBOOT_THRESHOLD);
    await tick(1);
    expect(getCore().reboots.value).toBe(1);
  });

  it('never forfeits an Elseworld in progress', () => {
    const state = { pendingLegacy: 10, legacyEarned: 1, inElseworld: true };
    expect(shouldReboot(state, { share: 0 })).toBe(false);
    expect(shouldReboot({ ...state, inElseworld: false }, { share: 0 })).toBe(true);
  });

  it('waits for its share of Legacy earned', () => {
    const state = { pendingLegacy: 4, legacyEarned: 10, inElseworld: false };
    expect(shouldReboot(state, { share: 0.5 })).toBe(false);
    expect(shouldReboot({ ...state, pendingLegacy: 5 }, { share: 0.5 })).toBe(true);
  });
});
