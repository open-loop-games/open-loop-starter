import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { REBOOT_THRESHOLD, REWRITE_THRESHOLD } from '../data';
import { boot, tick } from '../sim/harness';
import { getContinuity } from './continuity';
import { getCore } from './core';
import { getLegacy } from './legacy';
import { getPrestige } from './prestige';
import { getRun } from './run';

/**
 * What the two prestige layers and the Elseworlds do. No magnitudes: what a
 * layer pays is the spine's question, and `../balance/arc-probe.ts` measures it.
 */

const num = (v: unknown): number => new Decimal(v as never).toNumber();
const owned = (id: string) => num(getRun().heroes.getProducer(id)!.ownedCount.value);

/** Earn this timeline's way to a Reboot. */
const earnToReboot = () => addResource(getRun().justice, REBOOT_THRESHOLD);
/** Bank enough Legacy since the last Rewrite to open one. */
const earnToRewrite = () => addResource(getLegacy().legacy, REWRITE_THRESHOLD);

beforeEach(() => boot());

describe('Reboot the Timeline', () => {
  it('needs pending Legacy', () => {
    expect(getPrestige().reboot()).toBe(false);
    expect(getCore().reboots.value).toBe(0);
  });

  it('banks Legacy and wipes the run', async () => {
    earnToReboot();
    getRun().heroes.getProducer('patrol')!.repeatable!.purchase(1);
    expect(getPrestige().reboot()).toBe(true);
    await tick(1);
    expect(num(getLegacy().legacy.value)).toBeGreaterThan(0);
    expect(owned('patrol')).toBe(0);
    expect(num(getRun().runEarned.value)).toBeLessThan(num(REBOOT_THRESHOLD));
  });

  it('makes every hero earn more', async () => {
    const before = num(getCore().output.apply(1));
    earnToReboot();
    getPrestige().reboot();
    await tick(1);
    expect(num(getCore().output.apply(1))).toBeGreaterThan(before);
  });
});

describe('Rewrite the Multiverse', () => {
  it('banks Continuity and wipes Legacy and its shop', async () => {
    earnToRewrite();
    getLegacy().upgrade('public-trust').purchase(1);
    expect(getPrestige().rewrite()).toBe(true);
    await tick(1);
    expect(num(getContinuity().continuity.value)).toBeGreaterThan(0);
    expect(num(getLegacy().legacy.value)).toBe(0);
    expect(getLegacy().upgrade('public-trust').active.value).toBe(false);
  });

  it('keeps the Dispatch Desk through it once Eternal Dispatch is owned', async () => {
    addResource(getContinuity().continuity, 1);
    getContinuity().upgrade('eternal-dispatch').purchase(1);
    earnToRewrite();
    getLegacy().upgrade('dispatch').purchase(1);
    getPrestige().rewrite();
    await tick(1);
    expect(getLegacy().upgrade('dispatch').active.value).toBe(true);
  });
});

describe('Elseworlds', () => {
  /** Buy Elseworld Protocols, which opens the Elseworlds. */
  function openProtocols() {
    addResource(getLegacy().legacy, 100);
    getLegacy().upgrade('elseworld-protocols').purchase(1);
  }

  it('are closed until Elseworld Protocols is bought', () => {
    expect(getPrestige().enterElseworld('no-powers')).toBe(false);
    openProtocols();
    expect(getPrestige().enterElseworld('no-powers')).toBe(true);
  });

  it('silence the high tiers under No Powers while entered', async () => {
    openProtocols();
    addResource(getRun().justice, 1e12);
    getRun().heroes.getProducer('tower')!.repeatable!.purchase(1);
    const tower = getRun().heroes.getProducer('tower')!;
    expect(num(tower.computedRate.value)).toBeGreaterThan(0);
    getPrestige().enterElseworld('no-powers');
    await tick(1);
    expect(num(tower.computedRate.value)).toBe(0);
    getPrestige().abandonElseworld();
    await tick(1);
    expect(num(tower.computedRate.value)).toBeGreaterThan(0);
  });

  it('keep their reward once resolved', async () => {
    openProtocols();
    getPrestige().enterElseworld('villain-uprising');
    const ruled = num(getRun().priceRatio.value);
    addResource(getRun().justice, 1e30);
    await tick(2);
    expect(getPrestige().elseworlds.getChallenge('villain-uprising')!.completed.value).toBe(true);
    expect(num(getRun().priceRatio.value)).toBeLessThan(ruled);
  });
});
