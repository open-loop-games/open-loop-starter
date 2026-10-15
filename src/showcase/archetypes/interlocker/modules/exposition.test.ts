import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import {
  EXHIBITED,
  GRAND_PRIX,
  JURY_SITTING,
  PATENT_POOL,
  RAW,
  RESOURCES,
  scoreFor,
  type ResearchId,
} from '../data';
import { INTERVAL_RATE, boot, getEngine, tick } from '../sim/harness';
import { getEmpire } from './empire';
import { getExposition } from './exposition';
import { getMinistry } from './ministry';
import { InterlockerTuningRegistryKey } from './tuning';
import { getWorks } from './works';

const num = (r: { value: unknown }) => toNumber(r.value as number);

/** Patents an entry, paying its price from stock set for the purpose. */
function patent(id: ResearchId): void {
  const works = getWorks();
  for (const [res, cap] of Object.entries(works.cap))
    works.res[res as keyof typeof works.cap].value = new Decimal(Math.floor(cap.value));
  expect(toNumber(works.research.getPurchasable(id)!.purchase(1))).toBe(1);
}

/**
 * Fills every exhibited bin, the hangar's threshold lowered to meet it and the jury
 * sitting at once: a bronze medal's exhibit.
 */
function fillHangar(): void {
  getEngine()
    .tryInject(InterlockerTuningRegistryKey)!
    .pushOverrides('test', { 'expo/threshold': () => 5, 'expo/jurySitting': () => 0 });
  const works = getWorks();
  for (const r of EXHIBITED) works.res[r].value = new Decimal(Math.floor(works.cap[r].value));
}

describe('the Exposition', () => {
  beforeEach(() => boot());

  it('cannot be staged with the hangar short', () => {
    const expo = getExposition();
    expect(expo.canStage.value).toBe(false);
    expect(expo.stage()).toBe(0);
    expect(expo.cycle.count.value).toBe(0);
  });

  it('waits for the jury to sit', async () => {
    const expo = getExposition();
    patent('sawpit');
    getWorks().res.aeroplanes.value = new Decimal(Math.floor(getWorks().cap.aeroplanes.value));
    getEngine()
      .tryInject(InterlockerTuningRegistryKey)!
      .pushOverrides('test', { 'expo/threshold': () => 5 });
    expect(expo.gain.value).toBeGreaterThan(0);
    expect(expo.canStage.value).toBe(false);
    await tick(JURY_SITTING * INTERVAL_RATE);
    expect(expo.canStage.value).toBe(true);
  });

  it('pays a concave medal on the score: four times the score, twice the renown', () => {
    const expo = getExposition();
    const ministry = getMinistry();
    fillHangar();
    ministry.dossier.value = scoreFor(4);
    const four = expo.gain.value;
    ministry.dossier.value = scoreFor(8);
    expect(expo.gain.value).toBeGreaterThanOrEqual(8);
    expect(expo.gain.value).toBeLessThan(2 * four + 2);
  });

  it('awards the Grand Prix once a medal reaches it, and play goes on', () => {
    const expo = getExposition();
    fillHangar();
    getMinistry().dossier.value = scoreFor(GRAND_PRIX);
    expect(expo.stage()).toBeGreaterThanOrEqual(GRAND_PRIX);
    expect(getEmpire().grandPrix.value).toBe(true);
    expect(getWorks().owned('yard')).toBe(1);
  });

  it('pays renown, counts the Exposition and clears the works', async () => {
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

  it('keeps the founding patents, and only those, under the Patent Pool', async () => {
    const works = getWorks();
    const empire = getEmpire();
    empire.renown.value = new Decimal(10);
    expect(toNumber(empire.charters.getPurchasable('patents')!.purchase(1))).toBe(1);
    for (const id of [...PATENT_POOL, 'hall'] as ResearchId[]) patent(id);
    fillHangar();

    getExposition().stage();
    for (const id of PATENT_POOL) expect(works.researched(id).value).toBe(true);
    expect(works.researched('hall').value).toBe(false);
    expect(empire.holds('patents').value).toBe(true);
  });

  it('advances Crédit Mobilier’s stake into the run it is petitioned in, and every run after', () => {
    const works = getWorks();
    const empire = getEmpire();
    for (const r of RAW) works.res[r].value = new Decimal(0);
    empire.renown.value = new Decimal(10);
    expect(toNumber(empire.charters.getPurchasable('credit')!.purchase(1))).toBe(1);
    for (const r of RAW) expect(num(works.res[r])).toBeGreaterThan(0);

    fillHangar();
    expect(getExposition().stage()).toBeGreaterThan(0);
    for (const r of RAW) {
      const start = RESOURCES.find((d) => d.id === r)!.start;
      expect(num(works.res[r])).toBeGreaterThan(start);
    }
  });

  it('lifts every raw building’s yield with the renown earned', async () => {
    const works = getWorks();
    works.res.spruce.value = new Decimal(0);
    await tick(20);
    const before = num(works.res.spruce);

    fillHangar();
    expect(getExposition().stage()).toBeGreaterThan(0);
    works.res.spruce.value = new Decimal(0);
    await tick(20);
    expect(num(works.res.spruce)).toBeGreaterThan(before);
  });
});
