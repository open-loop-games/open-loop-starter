import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import { PATENT_POOL, type ResearchId } from '../data';
import { boot, getEngine, tick } from '../sim/harness';
import { getEmpire } from './empire';
import { getExposition } from './exposition';
import { InterlockerTuningRegistryKey } from './tuning';
import { getWorks } from './works';

const num = (r: { value: unknown }) => toNumber(r.value as number);

/** Patents an entry, paying its price from stock set for the purpose. */
function patent(id: ResearchId): void {
  const works = getWorks();
  for (const [res, cap] of Object.entries(works.cap))
    works.res[res as keyof typeof works.cap].value = new Decimal(Math.floor(cap.value));
  expect(works.research.getPurchasable(id)!.purchase(1)).toBeTruthy();
}

/** Fills the hangar as far as the base bin allows, with the threshold lowered to meet it. */
function fillHangar(): void {
  getEngine()
    .tryInject(InterlockerTuningRegistryKey)!
    .pushOverrides('test', { 'expo/threshold': () => 5 });
  const works = getWorks();
  works.res.aeroplanes.value = new Decimal(Math.floor(works.cap.aeroplanes.value));
}

describe('the Exposition', () => {
  beforeEach(() => boot());

  it('cannot be staged with the hangar short', () => {
    const expo = getExposition();
    expect(expo.canStage.value).toBe(false);
    expect(expo.stage()).toBe(0);
    expect(expo.cycle.count.value).toBe(0);
  });

  it('pays renown, counts the Exposition and clears the works', () => {
    const works = getWorks();
    const expo = getExposition();
    patent('sawpit');
    fillHangar();

    const earned = expo.stage();
    expect(earned).toBeGreaterThan(0);
    expect(num(getEmpire().renown)).toBe(earned);
    expect(expo.cycle.count.value).toBe(1);
    expect(works.researched('sawpit').value).toBe(false);
    expect(num(works.res.aeroplanes)).toBe(0);
    expect(works.owned('yard')).toBe(1);
  });

  it('keeps the founding patents, and only those, under the Patent Pool', () => {
    const works = getWorks();
    const empire = getEmpire();
    empire.renown.value = new Decimal(10);
    expect(empire.charters.getPurchasable('patents')!.purchase(1)).toBeTruthy();
    for (const id of [...PATENT_POOL, 'hall'] as ResearchId[]) patent(id);
    fillHangar();

    getExposition().stage();
    for (const id of PATENT_POOL) expect(works.researched(id).value).toBe(true);
    expect(works.researched('hall').value).toBe(false);
    expect(empire.holds('patents').value).toBe(true);
  });

  it('lifts every raw building’s yield with the renown earned', async () => {
    const works = getWorks();
    works.res.spruce.value = new Decimal(0);
    await tick(20);
    const before = num(works.res.spruce);

    fillHangar();
    getExposition().stage();
    await tick(20);
    expect(num(works.res.spruce)).toBeGreaterThan(before);
  });
});
