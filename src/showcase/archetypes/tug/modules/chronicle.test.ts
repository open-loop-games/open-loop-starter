import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { ANCHORS, FIELDS, NO_TWIST } from '../data';
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

  it('opens troops field by field: yeomen at Grubb’s Ford, bowmen by his keep', () => {
    const c = getChronicle();
    const keep = getKeep('player');
    expect(keep.isOpen('pike')).toBe(true);
    expect(keep.isOpen('bow')).toBe(false);
    c.rung.value = FIELDS.findIndex((f) => f.open.includes('bow'));
    expect(keep.isOpen('bow')).toBe(true);
    expect(getKeep('rival').isOpen('bow')).toBe(true);
  });

  it('grows a strength boon’s keep chain, and the lord’s men with the field', () => {
    const c = getChronicle();
    const fairhold = getKeep('player');
    const before = fairhold.income.value;
    c.renown.addXp(ANCHORS.renownBase * 3);
    c.boons.getPurchasable('fields')!.purchase(1);
    expect(fairhold.income.value).toBeGreaterThan(before);
    const vigor = () => toNumber(c.chains.rival.vigor.apply(1));
    const rivalBefore = vigor();
    c.rung.value = 2;
    expect(vigor()).toBeGreaterThan(rivalBefore);
  });

  it('draws the next battle’s twist: none on a calm field, never the same twice running', () => {
    const c = getChronicle();
    expect(c.field.value.calm).toBe(true);
    c.record(true, 200);
    expect(c.twist.value).toBe(NO_TWIST);
    c.rung.value = FIELDS.findIndex((f) => !f.calm);
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      c.record(false, 200);
      seen.push(c.twistId.value);
    }
    expect(seen).not.toContain(NO_TWIST.id);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
  });

  it('mounts the first weapon its boon opens', () => {
    const c = getChronicle();
    expect(getKeep('player').weapon.value).toBeNull();
    c.renown.addXp(ANCHORS.renownBase * 3);
    c.boons.getPurchasable('trebuchet')!.purchase(1);
    expect(c.mounted.value).toBe('trebuchet');
    expect(getKeep('player').weapon.value).toBe('trebuchet');
  });

  it('reaches the ending once, when the last keep falls', () => {
    const c = getChronicle();
    c.rung.value = ANCHORS.rungs - 1;
    expect(c.record(true, 300).ending).toBe(true);
    expect(c.endingReached.value).toBe(true);
    expect(c.record(true, 300).ending).toBe(false);
  });

  it('plays a skirmish on the field, twist and lord the player sets, for no renown', () => {
    const c = getChronicle();
    c.rung.value = ANCHORS.rungs;
    c.endingReached.value = true;
    const xp = toNumber(c.renown.xp.value);
    c.skirmish.value = { field: 4, twist: 'rain', lord: 2 };
    expect(c.field.value).toBe(FIELDS[4]);
    expect(c.twist.value.id).toBe('rain');
    expect(c.lord.value.name).toBe('Lady Vesk');
    const entry = c.record(true, 200);
    expect(entry.skirmish).toBe(true);
    expect(toNumber(c.renown.xp.value)).toBe(xp);
    expect(c.rung.value).toBe(ANCHORS.rungs);
  });
});
