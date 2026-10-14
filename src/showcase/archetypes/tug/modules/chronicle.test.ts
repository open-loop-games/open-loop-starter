import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { ANCHORS } from '../data';
import { boot } from '../sim/harness';
import { getChronicle } from './chronicle';
import { getKeep } from './keep';

beforeEach(() => boot());

describe('the Chronicle', () => {
  it('fills volumes with renown, and each volume mints a boon', () => {
    const c = getChronicle();
    c.renown.addXp(ANCHORS.renownBase);
    expect(c.volume.value).toBe(1);
    expect(toNumber(c.boonPoints.value)).toBe(1);
  });

  it('opens the bowmen with the Charter of the Longbow', () => {
    const c = getChronicle();
    const keep = getKeep('player');
    expect(keep.isOpen('bow')).toBe(false);
    c.renown.addXp(ANCHORS.renownBase);
    c.boons.getPurchasable('longbow')!.purchase(1);
    expect(keep.isOpen('bow')).toBe(true);
  });

  it('grows a strength boon’s keep chain, and the rival’s harvest with the rung', () => {
    const c = getChronicle();
    const fairhold = getKeep('player');
    const rival = getKeep('rival');
    const before = fairhold.income.value;
    c.renown.addXp(ANCHORS.renownBase * 3);
    c.boons.getPurchasable('fields')!.purchase(1);
    expect(fairhold.income.value).toBeGreaterThan(before);
    const rivalBefore = rival.income.value;
    c.rung.value = 2;
    expect(rival.income.value).toBeGreaterThan(rivalBefore);
  });

  it('reaches the ending once, when the last keep falls', () => {
    const c = getChronicle();
    c.rung.value = ANCHORS.rungs - 1;
    expect(c.record(true, 300).ending).toBe(true);
    expect(c.endingReached.value).toBe(true);
    expect(c.record(true, 300).ending).toBe(false);
  });
});
