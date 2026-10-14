import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { AGE_KEEPS, REWRITE_THRESHOLD, ageGate } from '../data';
import { boot, tick, tickUntil } from '../sim/harness';
import { getCanon } from './canon';
import { getContinuity } from './continuity';
import { getCore } from './core';
import { getLegacy } from './legacy';
import { getPrestige } from './prestige';
import { getRun } from './run';

/**
 * What the three prestige layers and the Elseworlds do. No magnitudes: what a
 * layer pays is the spine's question, and `../balance/arc-probe.ts` measures it.
 */

const num = (v: unknown): number => new Decimal(v as never).toNumber();
const owned = (id: string) => num(getRun().heroes.getProducer(id)!.ownedCount.value);

/** Earn this timeline's way to a Reboot: Justice only counts once heroes earn it. */
async function earnToReboot() {
  addResource(getRun().justice, 1e15);
  getRun().heroes.getProducer('bastion')!.repeatable!.purchase(10);
  await tickUntil(() => Decimal.gte(getPrestige().pendingLegacy.value, 1), 20 * 600);
}
/** Bank enough Legacy since the last Rewrite to open one. */
const earnToRewrite = () => getLegacy().bank(REWRITE_THRESHOLD);
/** Bank enough Continuity this Age to open the next Age. */
const earnToAge = () => getContinuity().bank(ageGate(getCore().ages.value));

beforeEach(() => boot());

describe('Reboot the Timeline', () => {
  it('needs pending Legacy', () => {
    expect(getPrestige().reboot()).toBe(false);
    expect(getCore().reboots.value).toBe(0);
  });

  it('counts only what heroes earn toward it', async () => {
    addResource(getRun().justice, 1e15);
    expect(num(getRun().runEarned.value)).toBe(0);
    getRun().heroes.getProducer('patrol')!.repeatable!.purchase(1);
    await tick(20);
    expect(num(getRun().runEarned.value)).toBeGreaterThan(0);
  });

  it('banks Legacy and wipes the run', async () => {
    await earnToReboot();
    expect(getPrestige().reboot()).toBe(true);
    await tick(1);
    expect(num(getLegacy().legacy.value)).toBeGreaterThan(0);
    expect(owned('bastion')).toBe(0);
    expect(num(getRun().runEarned.value)).toBe(0);
  });

  it('keeps counting a timeline that lifetime Justice dwarfs', async () => {
    addResource(getRun().justice, 1e25);
    await earnToReboot();
    getPrestige().reboot();
    getRun().heroes.getProducer('patrol')!.repeatable!.purchase(1);
    await tick(20);
    expect(num(getRun().runEarned.value)).toBeGreaterThan(0);
  });

  it('makes every hero earn more', async () => {
    const before = num(getCore().output.apply(1));
    await earnToReboot();
    getPrestige().reboot();
    await tick(1);
    expect(num(getCore().output.apply(1))).toBeGreaterThan(before);
  });
});

describe('Rewrite the Multiverse', () => {
  it('banks Continuity and wipes Legacy, its shop and the Network', async () => {
    earnToRewrite();
    getLegacy().upgrade('public-trust').purchase(1);
    getLegacy().network.getProducer('informant')!.repeatable!.purchase(1);
    expect(getPrestige().rewrite()).toBe(true);
    await tick(1);
    expect(num(getContinuity().continuity.value)).toBeGreaterThan(0);
    expect(num(getLegacy().legacy.value)).toBe(0);
    expect(getLegacy().upgrade('public-trust').active.value).toBe(false);
    expect(num(getLegacy().network.getProducer('informant')!.ownedCount.value)).toBe(0);
  });

  it('keeps the Dispatch Desk through it once Eternal Dispatch is owned', async () => {
    getContinuity().bank(1);
    getContinuity().upgrade('eternal-dispatch').purchase(1);
    earnToRewrite();
    getLegacy().upgrade('dispatch').purchase(1);
    getPrestige().rewrite();
    await tick(1);
    expect(getLegacy().upgrade('dispatch').active.value).toBe(true);
  });
});

describe('Turn the Age', () => {
  it('stays shut until Continuity earned this Age meets the gate', () => {
    expect(getPrestige().turnAge()).toBe(false);
    earnToAge();
    expect(getPrestige().turnAge()).toBe(true);
    expect(getCore().ages.value).toBe(1);
  });

  it('banks Canon and wipes Continuity, its shop and the Earths', async () => {
    earnToAge();
    getContinuity().upgrade('mythic').purchase(1);
    getContinuity().earths.getProducer('earth-two')!.repeatable!.purchase(1);
    getPrestige().turnAge();
    await tick(1);
    expect(num(getCanon().canon.value)).toBeGreaterThan(0);
    expect(num(getContinuity().continuity.value)).toBe(0);
    expect(num(getContinuity().continuityEarned.value)).toBe(0);
    expect(num(getContinuity().upgrade('mythic').count.value)).toBe(0);
    expect(num(getContinuity().earths.getProducer('earth-two')!.ownedCount.value)).toBe(0);
  });

  it('keeps the automation and the Archives', async () => {
    getContinuity().bank(1e3);
    for (const id of AGE_KEEPS) getContinuity().upgrade(id).purchase(1);
    earnToAge();
    getPrestige().turnAge();
    await tick(1);
    for (const id of AGE_KEEPS) expect(getContinuity().upgrade(id).active.value).toBe(true);
  });

  it('keeps the Dispatch Desk and the Protocols once Eternal Dispatch is owned', async () => {
    getContinuity().bank(1);
    getContinuity().upgrade('eternal-dispatch').purchase(1);
    getLegacy().bank(100);
    getLegacy().upgrade('dispatch').purchase(1);
    getLegacy().upgrade('elseworld-protocols').purchase(1);
    earnToAge();
    getPrestige().turnAge();
    await tick(1);
    expect(getLegacy().upgrade('dispatch').active.value).toBe(true);
    expect(getLegacy().upgrade('elseworld-protocols').active.value).toBe(true);
  });

  it('asks more of each Age than the last', () => {
    expect(ageGate(1)).toBeGreaterThan(ageGate(0));
    expect(ageGate(5)).toBeGreaterThan(ageGate(4));
  });

  it('makes every hero earn more', async () => {
    const before = num(getCore().output.apply(1));
    earnToAge();
    getPrestige().turnAge();
    await tick(1);
    expect(num(getCore().output.apply(1))).toBeGreaterThan(before);
  });
});

describe('Elseworlds', () => {
  /** Buy Elseworld Protocols, which opens the Elseworlds. */
  function openProtocols() {
    getLegacy().bank(100);
    getLegacy().upgrade('elseworld-protocols').purchase(1);
  }
  /** Resolve the entered Elseworld; what its goal takes is the spine's question. */
  async function resolve() {
    getPrestige().elseworlds.current.value!.complete();
    await tick(1);
  }
  const completions = (id: 'villain-uprising' | 'dark-days') =>
    getPrestige().elseworlds.getChallenge(id)!.completions.value;

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

  it('grow their reward with each tier resolved', async () => {
    openProtocols();
    const base = num(getRun().priceRatio.value);
    getPrestige().enterElseworld('villain-uprising');
    await resolve();
    const first = num(getRun().priceRatio.value);
    expect(first).toBeLessThan(base);
    getPrestige().enterElseworld('villain-uprising');
    await resolve();
    expect(completions('villain-uprising')).toBe(2);
    expect(num(getRun().priceRatio.value)).toBeLessThan(first);
  });

  it('close at their cap until the Archives raise it', async () => {
    openProtocols();
    for (let i = 0; i < 2; i++) {
      getPrestige().enterElseworld('villain-uprising');
      await resolve();
    }
    expect(getPrestige().enterElseworld('villain-uprising')).toBe(false);
    getContinuity().bank(10);
    getContinuity().upgrade('archives').purchase(1);
    expect(getPrestige().enterElseworld('villain-uprising')).toBe(true);
  });

  it('open Dark Days only after a Rewrite, and it stops Hope', async () => {
    openProtocols();
    expect(getPrestige().enterElseworld('dark-days')).toBe(false);
    getContinuity().bank(1);
    getContinuity().upgrade('eternal-dispatch').purchase(1);
    earnToRewrite();
    getPrestige().rewrite();
    getLegacy().bank(100);
    getLegacy().network.getProducer('informant')!.repeatable!.purchase(1);
    expect(getPrestige().enterElseworld('dark-days')).toBe(true);
    await tick(40);
    expect(num(getRun().hope.value)).toBe(0);
    expect(completions('dark-days')).toBe(0);
  });
});
