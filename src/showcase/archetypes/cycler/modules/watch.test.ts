import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { boot, seconds, tickUntil } from '../sim/harness';
import { getLogbook } from './logbook';
import { getWatch } from './watch';
import { cellKey, quartersOf, SHORE_CELLS } from './rock';

beforeEach(() => {
  boot();
  getWatch().openFirstWatch();
});

const num = toNumber;
const toDusk = () => seconds(getWatch().phaseLength.value - getWatch().clock.value + 1);

/** A shore cell off tonight's side, and one on it. */
function leeCell() {
  const q = getWatch().quarter.value;
  return SHORE_CELLS.find(
    (c) => quartersOf(c.x, c.y).length === 1 && !quartersOf(c.x, c.y).includes(q),
  )!;
}
function struckCell() {
  const q = getWatch().quarter.value;
  return SHORE_CELLS.find(
    (c) => quartersOf(c.x, c.y).length === 1 && quartersOf(c.x, c.y).includes(q),
  )!;
}

describe('the first watch', () => {
  it('opens by itself on day one with salvage to spend', () => {
    const w = getWatch();
    expect(w.phase.value).toBe('day');
    expect(w.night.value).toBe(1);
    expect(num(w.salvage.value)).toBeGreaterThan(0);
  });
});

describe('building', () => {
  it('places a piece only on its own ground, and only by day', async () => {
    const w = getWatch();
    expect(w.build('buttress', 0, 0)).toBe(false);
    expect(w.build('breakwater', 0, 0)).toBe(true);
    expect(w.build('net', 0, 0)).toBe(false);
    await toDusk();
    expect(w.phase.value).toBe('night');
    expect(w.build('breakwater', 1, 0)).toBe(false);
  });

  it('refunds a piece in full when it is taken up', () => {
    const w = getWatch();
    const before = num(w.salvage.value);
    w.build('breakwater', 2, 0);
    w.build('breakwater', 3, 0);
    w.clear(3, 0);
    w.clear(2, 0);
    expect(num(w.salvage.value)).toBeCloseTo(before, 6);
    expect(w.placed.value).toHaveLength(0);
  });
});

describe('the tideline', () => {
  it('holds a net’s catch until it is hauled', async () => {
    const w = getWatch();
    const c = leeCell();
    w.build('net', c.x, c.y);
    const before = num(w.salvage.value);
    await seconds(10);
    expect(num(w.tideline.get(cellKey(c.x, c.y)))).toBeGreaterThan(0);
    expect(num(w.salvage.value)).toBe(before);
    w.haul(c.x, c.y);
    expect(num(w.salvage.value)).toBeGreaterThan(before);
    expect(num(w.tideline.get(cellKey(c.x, c.y)))).toBe(0);
  });

  it('catches faster at night, and holds the night’s catch for the morning', async () => {
    const w = getWatch();
    const c = leeCell();
    w.build('net', c.x, c.y);
    w.haulAll();
    await seconds(4);
    const day = num(w.tideline.get(cellKey(c.x, c.y)));
    await toDusk();
    w.tideline.subtract(cellKey(c.x, c.y), w.tideline.get(cellKey(c.x, c.y)));
    await seconds(4);
    expect(num(w.tideline.get(cellKey(c.x, c.y)))).toBeGreaterThan(day);
    expect(w.haul(c.x, c.y)).toBe(0);
  });

  it('spills what a full net cannot hold', async () => {
    const w = getWatch();
    const c = leeCell();
    w.build('net', c.x, c.y);
    await seconds(w.phaseLength.value - 1);
    w.lightLamp();
    await toDusk();
    expect(num(w.tideline.get(cellKey(c.x, c.y)))).toBeLessThanOrEqual(
      num(w.tideline.capacity.value),
    );
  });

  it('is hauled by a winch that touches the net', async () => {
    const w = getWatch();
    w.salvage.value = 10_000;
    w.build('net', 1, 0);
    w.build('winch', 1, 1);
    const before = num(w.salvage.value);
    await seconds(5);
    expect(num(w.tideline.get(cellKey(1, 0)))).toBe(0);
    expect(num(w.salvage.value)).toBeGreaterThan(before);
  });
});

describe('the alternation', () => {
  it('turns day into night at dusk, and night into the next day at dawn', async () => {
    const w = getWatch();
    await toDusk();
    expect(w.phase.value).toBe('night');
    await toDusk();
    expect(w.phase.value).toBe('day');
    expect(w.night.value).toBe(2);
  });

  it('can be brought to dusk early by lighting the lamp', () => {
    const w = getWatch();
    expect(w.lightLamp()).toBe(true);
    expect(w.phase.value).toBe('night');
  });

  it('lands every breaker on tonight’s quarter, one more each night', async () => {
    const w = getWatch();
    const first = w.breakers.value;
    w.lightLamp();
    await seconds(w.phaseLength.value - 1);
    expect(w.struck.value).toBe(first);
    expect(w.lastStrike.value!.quarter).toBe(w.quarter.value);
    await seconds(2);
    expect(w.breakers.value).toBe(first + 1);
  });

  it('offers three different finds at dawn, takes one, and loses the rest at dusk', async () => {
    const w = getWatch();
    w.lightLamp();
    await toDusk();
    const offer = w.offer.value;
    expect(offer).toHaveLength(3);
    expect(new Set(offer).size).toBe(3);
    await toDusk();
    expect(w.offer.value).toHaveLength(0);
  });
});

describe('the storm', () => {
  it('breaks on the tower and never on the board', async () => {
    const w = getWatch();
    const c = struckCell();
    w.build('breakwater', c.x, c.y);
    const pieces = w.placed.value.length;
    w.integrity.value = w.integrityMax.value;
    w.night.value = 7; // a storm past one wall, short of the tower
    w.lightLamp();
    await seconds(10);
    expect(num(w.integrity.value)).toBeLessThan(w.integrityMax.value);
    expect(w.placed.value).toHaveLength(pieces);
  });

  it('is shored up only at night, at a price that doubles each time', async () => {
    const w = getWatch();
    w.salvage.value = 10_000;
    expect(w.shoreUp()).toBe(false);
    w.lightLamp();
    const price = w.shoreCost.value;
    expect(w.shoreUp()).toBe(true);
    expect(w.shoreCost.value).toBe(price * 2);
    expect(w.shored.value).toBeGreaterThan(0);
  });

  it('is pegged when the watch starts, so power bought mid-watch does not move it', () => {
    const w = getWatch();
    const storm = w.storm.value;
    getLogbook().knowledge.getPurchasable('stone')!.count.value = 3;
    expect(w.storm.value).toBe(storm);
  });
});

describe('the light going out', () => {
  it('ends the watch, writes the logbook and waits for the next posting', async () => {
    const w = getWatch();
    const l = getLogbook();
    w.night.value = 20;
    w.lightLamp();
    await tickUntil(() => w.phase.value === 'setup', 4 * 120);
    expect(w.cycle.count.value).toBe(1);
    expect(l.lastWatch.value).not.toBeNull();
    expect(num(l.entries.value)).toBe(l.lastWatch.value!.entries);
    expect(w.placed.value).toHaveLength(0);
    const elapsed = w.cycle.elapsed.value;
    await seconds(30);
    expect(w.cycle.elapsed.value).toBe(elapsed);
    w.startWatch();
    expect(w.phase.value).toBe('day');
  });
});
