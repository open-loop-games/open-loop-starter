import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { boot } from '../sim/harness';
import { getLogbook } from './logbook';
import { getWatch } from './watch';

beforeEach(() => boot());

const buy = (id: Parameters<ReturnType<typeof getLogbook>['level']>[0]) =>
  toNumber(getLogbook().knowledge.getPurchasable(id)!.purchase(1)) > 0;

describe('the keeper’s knowledge', () => {
  it('is bought with logbook entries', () => {
    const l = getLogbook();
    expect(buy('tides')).toBe(false);
    l.entries.value = 100;
    expect(buy('tides')).toBe(true);
    expect(l.level('tides')).toBe(1);
    expect(toNumber(l.entries.value)).toBeLessThan(100);
  });

  it('keeps the almanac shut until two levels of stone are learned', () => {
    const l = getLogbook();
    l.entries.value = 1000;
    expect(buy('almanac')).toBe(false);
    buy('stone');
    buy('stone');
    expect(buy('almanac')).toBe(true);
  });

  it('re-pegs the storm to stone, so a stronger keeper meets a stronger sea', () => {
    const l = getLogbook();
    const before = l.spine.value;
    l.knowledge.getPurchasable('stone')!.count.value = 2;
    const after = l.spine.value;
    expect(after.cMax).toBeGreaterThan(before.cMax);
    expect(after.cMax / after.w0).toBeCloseTo(before.cMax / before.w0, 9);
  });

  it('slows the storm’s growth with each almanac level', () => {
    const l = getLogbook();
    const w = getWatch();
    w.startWatch();
    const g0 = w.g.value;
    w.night.value = 20;
    w.lightLamp();
    l.knowledge.getPurchasable('almanac')!.count.value = 1;
    w.cycle.end();
    w.startWatch();
    expect(w.g.value).toBeLessThan(g0);
  });
});

describe('postings', () => {
  it('open only Haven Point until a charter is bought', () => {
    const l = getLogbook();
    expect(l.posting.canSelect('skerry')).toBe(false);
    l.knowledge.getPurchasable('charter-skerry')!.count.value = 1;
    expect(l.posting.canSelect('skerry')).toBe(true);
  });

  it('can change only between watches', () => {
    const l = getLogbook();
    l.knowledge.getPurchasable('charter-wrath')!.count.value = 1;
    getWatch().startWatch();
    expect(l.posting.canSelect('wrath')).toBe(false);
    getWatch().cycle.end();
    expect(l.posting.canSelect('wrath')).toBe(true);
    l.posting.select('wrath');
    getWatch().startWatch();
    expect(getWatch().posting.value.id).toBe('wrath');
  });
});
