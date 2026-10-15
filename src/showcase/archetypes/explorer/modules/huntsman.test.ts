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

/** Raise a camp on the first waystone and stand the huntsman on it. */
function atCamp(): { x: number; y: number } {
  const wold = getWold();
  const i = wold.tiles.findIndex((t) => t.feature === 'waystone');
  wold.raiseCamp(i);
  const at = { x: i % MAP_W, y: Math.floor(i / MAP_W) };
  getHuntsman().pos.value = at;
  return at;
}

describe('the huntsman', () => {
  beforeEach(() => boot());

  it('eats jerky and drinks water for every tile walked, and notes the ground around him', async () => {
    const man = getHuntsman();
    const wold = getWold();
    const supply = num(man.supply);
    const water = num(man.water);
    const charted = wold.chartedCount.value;

    expect(man.walkTo(NORTH)).toBe(true);
    await tickUntil(() => man.action.value === 'idle');

    expect(man.pos.value).toEqual(NORTH);
    expect(num(man.supply)).toBe(supply - wold.stepCost.value);
    expect(num(man.water)).toBe(water - wold.waterPerStep.value);
    expect(wold.notesCount.value).toBeGreaterThan(0);
    expect(wold.chartedCount.value).toBe(charted);
  });

  it('banks his notes into the chart on reaching the lodge, and refills at its well', async () => {
    const man = getHuntsman();
    const wold = getWold();
    man.walkTo(NORTH);
    await tickUntil(() => man.action.value === 'idle');
    const noted = wold.notesCount.value;
    const charted = wold.chartedCount.value;

    man.walkTo(LODGE);
    await tickUntil(() => man.action.value === 'idle');

    expect(wold.notesCount.value).toBe(0);
    expect(wold.chartedCount.value).toBe(charted + noted);
    expect(num(man.water)).toBe(man.waterCap.value);
  });

  it('falls when his water runs out away from water', async () => {
    const man = getHuntsman();
    const chronicle = getChronicle();
    man.walkTo(NORTH);
    await tickUntil(() => man.action.value === 'idle');
    man.water.value = getWold().waterPerStep.value;

    man.walkTo({ x: NORTH.x, y: NORTH.y - 1 });
    await tickUntil(() => man.action.value === 'idle');

    expect(man.pos.value).toEqual(LODGE);
    expect(chronicle.log.lines.value.at(-1)!.text).toMatch(/water is gone/);
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
    expect(chronicle.log.lines.value.at(-1)!.kind).toBe('bad');
    expect(getWold().notesCount.value).toBe(0);
  });

  it('restocks jerky and banks his notes at a camp, but not the pack', async () => {
    const man = getHuntsman();
    const wold = getWold();
    const { stores } = getLodge();
    const waystone = atCamp();
    wold.reveal(waystone.x, waystone.y, 1);
    man.supply.value = 0;
    man.pack.add('hide', 5);

    await tick(1);

    expect(num(man.supply)).toBeGreaterThan(0);
    expect(wold.notesCount.value).toBe(0);
    expect(man.packLoad.value).toBe(5);
    expect(num(stores.hide)).toBe(0);
  });

  it('banks the pack at a camp once the sledge is his', async () => {
    const man = getHuntsman();
    const { stores } = getLodge();
    getWold().grantTrophy('sledge');
    atCamp();
    man.pack.add('hide', 5);

    await tick(1);

    expect(man.packLoad.value).toBe(0);
    expect(num(stores.hide)).toBe(5);
  });

  it('drinks at a camp only once the mattock has dug its well', async () => {
    const man = getHuntsman();
    const wold = getWold();
    const camp = atCamp();
    man.water.value = 0;
    await tick(1);
    expect(wold.isWaterSource(camp.x, camp.y)).toBe(false);
    expect(num(man.water)).toBe(0);

    wold.grantTrophy('mattock');
    await tick(1);

    expect(num(man.water)).toBe(man.waterCap.value);
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
