import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { LAIR, LODGE, MAP_W, HART_TRAIL_KILLS } from '../data';
import { boot, tick, tickUntil } from '../sim/harness';
import { getChronicle } from './chronicle';
import { getHuntsman } from './huntsman';
import { getLodge } from './lodge';
import { getWold } from './wold';

const num = (r: { value: unknown }) => toNumber(r.value as number);
const NORTH = { x: LODGE.x, y: LODGE.y - 1 };

describe('the huntsman', () => {
  beforeEach(() => boot());

  it('eats jerky for every tile walked and charts the ground around him', async () => {
    const man = getHuntsman();
    const wold = getWold();
    const supply = num(man.supply);
    const charted = wold.chartedCount.value;

    expect(man.walkTo(NORTH)).toBe(true);
    await tickUntil(() => man.action.value === 'idle');

    expect(man.pos.value).toEqual(NORTH);
    expect(num(man.supply)).toBe(supply - wold.stepCost.value);
    expect(wold.chartedCount.value).toBeGreaterThan(charted);
  });

  it('banks the pack only on reaching the lodge', async () => {
    const man = getHuntsman();
    const { stores } = getLodge();
    man.walkTo(NORTH);
    await tickUntil(() => man.action.value === 'idle');
    man.pack.add('hide', 5);
    await tick(10);
    expect(num(stores.hide)).toBe(0);

    man.walkTo(LODGE);
    await tickUntil(() => man.action.value === 'idle');

    expect(num(stores.hide)).toBe(5);
    expect(man.packLoad.value).toBe(0);
  });

  it('drops on the trail when the satchel empties away from a restock point, and loses the haul', async () => {
    const man = getHuntsman();
    const { stores } = getLodge();
    const chronicle = getChronicle();
    man.walkTo(NORTH);
    await tickUntil(() => man.action.value === 'idle');
    man.pack.add('hide', 5);
    man.supply.value = getWold().stepCost.value;

    man.walkTo({ x: NORTH.x, y: NORTH.y - 1 });
    await tickUntil(() => man.action.value === 'idle');

    expect(man.pos.value).toEqual(LODGE);
    expect(man.packLoad.value).toBe(0);
    expect(num(stores.hide)).toBe(0);
    expect(chronicle.log.value[0].tone).toBe('bad');
  });

  it('restocks jerky at a camp without banking the pack', async () => {
    const man = getHuntsman();
    const wold = getWold();
    const { stores } = getLodge();
    const waystone = wold.tiles.findIndex((t) => t.feature === 'waystone');
    wold.raiseCamp(waystone);
    man.pos.value = { x: waystone % MAP_W, y: Math.floor(waystone / MAP_W) };
    man.supply.value = 0;
    man.pack.add('hide', 5);

    await tick(1);

    expect(num(man.supply)).toBeGreaterThan(0);
    expect(man.packLoad.value).toBe(5);
    expect(num(stores.hide)).toBe(0);
  });

  it('finds the Hart only once the deepwood kills open its trail', () => {
    const man = getHuntsman();
    expect(man.herdAt(LAIR.x, LAIR.y)).toBeNull();

    man.kills.value = { stag: HART_TRAIL_KILLS };

    expect(man.hartTrail.value.open).toBe(true);
    expect(man.herdAt(LAIR.x, LAIR.y)?.id).toBe('hart');
  });

  it('stops every clock once the Hart is taken', async () => {
    const chronicle = getChronicle();
    const { stores } = getLodge();
    stores.meat.value = 100;
    stores.wood.value = 100;
    chronicle.won.value = true;
    const played = chronicle.time.totalPlayTime.value;
    const jerky = num(stores.jerky);

    await tick(40);

    expect(chronicle.time.totalPlayTime.value).toBe(played);
    expect(num(stores.jerky)).toBe(jerky);
  });
});
