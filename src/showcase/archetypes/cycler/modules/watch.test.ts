import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { boot, seconds, tickUntil } from '../sim/harness';
import { getLogbook } from './logbook';
import { getWatch } from './watch';
import { cellKey, quartersOf, SHORE_CELLS } from './rock';
import { neighbours } from './storm';
import { ANCHORS, SEA } from '../data';

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
    expect(w.shored.value[w.quarter.value]).toBeGreaterThan(0);
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

/** A tower no storm in these specs can fell, so the watch runs as long as a spec needs. */
function shoreTheTower(): void {
  const w = getWatch();
  w.integrityMax.value = 1e12;
  w.integrity.value = 1e12;
}

/** Plays dawns forward until `when` holds at one, or gives up after `nights`. */
async function untilDawn(when: () => boolean, nights = 40): Promise<boolean> {
  const w = getWatch();
  for (let i = 0; i < nights; i++) {
    if (w.phase.value === 'day' && when()) return true;
    if (w.integrityMax.value < 1e12) w.integrity.value = w.integrityMax.value;
    if (w.phase.value === 'day') w.lightLamp();
    await toDusk();
  }
  return false;
}

describe('spray', () => {
  it('is named at dawn and drawn at dusk, and only on spray nights', async () => {
    const w = getWatch();
    shoreTheTower();
    expect(await untilDawn(() => w.kind.value === 'spray')).toBe(true);
    expect(w.spray.value).toBe(0);
    w.lightLamp();
    expect(SEA.sprayShares).toContain(w.spray.value);
    await toDusk();
    expect(await untilDawn(() => w.kind.value === 'gale')).toBe(true);
    w.lightLamp();
    expect(w.spray.value).toBe(0);
  });
});

describe('backing', () => {
  it('names a neighbouring quarter from the middle of the watch, and lands breakers there', async () => {
    const w = getWatch();
    expect(w.backQuarter.value).toBeNull();
    expect(await untilDawn(() => w.backQuarter.value !== null)).toBe(true);
    expect(w.night.value).toBeGreaterThanOrEqual(SEA.backingFromNight);
    expect(neighbours(w.quarter.value)).toContain(w.backQuarter.value);
    const sides = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const back = w.backQuarter.value;
      w.integrity.value = w.integrityMax.value;
      w.lightLamp();
      for (let s = 0; s < w.phaseLength.value; s++) {
        await seconds(1);
        if (w.lastStrike.value && w.lastStrike.value.quarter === back) sides.add('back');
      }
      await untilDawn(() => true);
    }
    expect(sides.has('back')).toBe(true);
  });
});

describe('the boat', () => {
  it('rows out only to a sighted wreck, and the keeper does nothing else while away', async () => {
    const w = getWatch();
    expect(w.rowOut()).toBe(false);
    expect(await untilDawn(() => w.wreck.value > 0)).toBe(true);
    expect(w.rowOut()).toBe(true);
    expect(w.home.value).toBe(false);
    expect(w.build('breakwater', 2, 0)).toBe(false);
    expect(w.lightLamp()).toBe(false);
  });

  it('strips the wreck while there and banks the haul on landing', async () => {
    const w = getWatch();
    await untilDawn(() => w.wreck.value > 0);
    const before = num(w.salvage.value);
    w.rowOut();
    await seconds(SEA.rowSeconds + 20);
    expect(w.boatHaul.value).toBeGreaterThan(0);
    expect(num(w.salvage.value)).toBe(before);
    w.rowHome();
    await seconds(SEA.rowSeconds + 1);
    expect(w.home.value).toBe(true);
    expect(num(w.salvage.value)).toBeGreaterThan(before);
  });

  it('caught out at dusk, shelters till dawn without shoring, and lands the haul then', async () => {
    const w = getWatch();
    shoreTheTower();
    await untilDawn(() => w.wreck.value > 0);
    w.salvage.value = 10_000;
    w.rowOut();
    await toDusk();
    expect(w.caughtOut.value).toBe(true);
    expect(w.shoreUp()).toBe(false);
    const before = num(w.salvage.value);
    await toDusk();
    expect(w.home.value).toBe(true);
    expect(num(w.salvage.value)).toBeGreaterThan(before);
  });
});

describe('the relief', () => {
  beforeEach(() => {
    const l = getLogbook();
    const w = getWatch();
    w.cycle.end();
    l.knowledge.getPurchasable('charter-flannans')!.count.value = 1;
    l.knowledge.getPurchasable('charter-wrath')!.count.value = 1;
    l.posting.select('flannans');
    w.startWatch();
  });

  it('can be signalled only on the closing posting, from its first night of call', async () => {
    const w = getWatch();
    expect(w.posting.value.closing).toBe(true);
    expect(w.signalRelief()).toBe(false);
    expect(await untilDawn(() => w.night.value >= ANCHORS.callFromNight)).toBe(true);
    expect(w.signalRelief()).toBe(true);
  });

  it('makes the tower whole and brings a final gale no smaller than the crossing night’s', async () => {
    const w = getWatch();
    await untilDawn(() => w.night.value >= ANCHORS.callFromNight);
    const plain = w.storm.value;
    w.integrity.value = 1;
    w.signalRelief();
    expect(num(w.integrity.value)).toBe(w.integrityMax.value);
    expect(w.storm.value).toBeGreaterThan(plain * ANCHORS.finalGale - 1e-9);
  });

  it('closes the career on the light holding, and a lesser close when it goes out', async () => {
    const w = getWatch();
    const l = getLogbook();
    await untilDawn(() => w.night.value >= ANCHORS.callFromNight);
    w.signalRelief();
    w.lightLamp();
    await tickUntil(() => w.phase.value === 'setup', 4 * 120);
    expect(l.lastWatch.value!.relief).toBe('lost');
    expect(l.ending.value).toBe('lesser');
    // A rock walled all round, with stone enough, holds the same gale.
    l.knowledge.getPurchasable('stone')!.count.value = 8;
    w.startWatch();
    await untilDawn(() => w.night.value >= ANCHORS.callFromNight);
    w.salvage.value = 1e6;
    for (const c of SHORE_CELLS) w.build('breakwater', c.x, c.y);
    w.signalRelief();
    w.lightLamp();
    await tickUntil(() => w.phase.value === 'setup', 4 * 120);
    expect(l.lastWatch.value!.relief).toBe('held');
    expect(l.ending.value).toBe('held');
  });
});
