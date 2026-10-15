import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import { CARRIERS, COMMISSION_PURSE, type ShipId } from '../data';
import { boot, tick } from '../sim/harness';
import { getBoard } from './board';
import { getFleet } from './fleet';
import { getLine } from './line';
import { getYard } from './yard';

const num = (v: unknown) => toNumber(Decimal.fromValue(v as never));
/** Game-seconds as test-harness ticks. */
const seconds = (s: number) => tick(s * 20);

/** Plate the ship in service's first `n` sections, funding each. */
function plate(ship: ShipId, n: number) {
  const yard = getYard();
  yard.salvage.value = new Decimal(1e30);
  for (let i = 1; i <= n; i++) {
    const section = yard.hull.getPurchasable(`${ship}:section-${i}`)!;
    if (!section.active.value) expect(num(section.purchase(1))).toBe(1);
  }
}

/** Fit one cannon in the corvette core. */
function arm() {
  const yard = getYard();
  yard.salvage.value = Decimal.add(yard.salvage.value, 1e6);
  yard.fabricator.getPurchasable('pulse')!.purchase(1);
  expect(getBoard().place('pulse', 4, 5)).toBe(true);
}

/** Honours enough that one cannon outguns any carrier in a tick. */
const OVERWHELMING = 120;

describe('the breach line', () => {
  beforeEach(() => boot());

  it('stays closed until the cruiser keel is plated', () => {
    expect(getFleet().carrier.value).toBeNull();
    plate('frigate', 7);
    expect(getFleet().carrier.value?.def.id).toBe(CARRIERS[0]!.id);
    expect(getFleet().conditions.value.length).toBeGreaterThan(0);
  });

  it('engages a carrier only once the section it waits behind is plated', () => {
    plate('frigate', 7);
    expect(getLine().canEngage.value).toBe(false);
    plate('frigate', 8);
    expect(getLine().canEngage.value).toBe(true);
  });
});

describe('an engagement', () => {
  beforeEach(() => {
    boot();
    plate('frigate', 8);
  });

  it('ends in a withdrawal when the window runs out, and costs nothing', async () => {
    const line = getLine();
    const fleet = getFleet();
    expect(line.engage()).toBe(true);
    await seconds(31);
    expect(line.engagement.value).toBeNull();
    expect(line.last.value).toBe('withdrew');
    expect(fleet.authoredFallen.value).toBe(0);
    expect(line.canEngage.value).toBe(true);
  });

  it('downs the carrier when the board’s fire covers its hull: an honour, and the next sector', async () => {
    const line = getLine();
    const fleet = getFleet();
    arm();
    fleet.honours.value = OVERWHELMING;
    const before = fleet.conditions.value;
    line.engage();
    await seconds(1);
    expect(line.last.value).toBe('fell');
    expect(fleet.honours.value).toBe(OVERWHELMING + 1);
    expect(fleet.authoredFallen.value).toBe(1);
    expect(fleet.carrier.value?.def.id).toBe(CARRIERS[1]!.id);
    expect(fleet.conditions.value).not.toEqual(before);
  });

  it('multiplies every weapon by each honour', () => {
    const fleet = getFleet();
    arm();
    const fp = getBoard().firepower.value;
    fleet.honours.value++;
    expect(getBoard().firepower.value).toBeGreaterThan(fp);
  });
});

describe('calibration', () => {
  beforeEach(() => boot());

  it('is offered once the line opens, and every level hits harder', () => {
    const yard = getYard();
    const cal = yard.calibration.getPurchasable('calibration')!;
    expect(cal.visible.value).toBe(false);
    plate('frigate', 7);
    expect(cal.visible.value).toBe(true);
    const mult = yard.globalMult.value;
    expect(num(cal.purchase(1))).toBe(1);
    expect(yard.globalMult.value).toBeGreaterThan(mult);
    expect(num(cal.purchase(1))).toBe(1);
  });
});

describe('the recommission', () => {
  beforeEach(() => boot());

  it('waits for the ship’s last carrier', () => {
    const fleet = getFleet();
    plate('frigate', 8);
    expect(getLine().canRecommission.value).toBe(false);
    fleet.authoredFallen.value = CARRIERS.filter((c) => c.ship === 'frigate').length;
    expect(getLine().canRecommission.value).toBe(true);
  });

  it('clears the yard and the board, keeps honours and schematics, and pays the grant', () => {
    const fleet = getFleet();
    const yard = getYard();
    fleet.authoredFallen.value = 2;
    plate('frigate', 11);
    arm();
    fleet.decrypted.value = ['targeting', 'beacon'];
    fleet.honours.value = 2;
    expect(getLine().recommission()).toBe(true);
    expect(fleet.ship.value).toBe('lancer');
    expect(getBoard().placed.value).toHaveLength(0);
    expect(yard.plated(1)).toBe(false);
    expect(fleet.honours.value).toBe(2);
    expect(yard.unlocked('beacon')).toBe(true);
    expect(num(yard.salvage.value)).toBeCloseTo(COMMISSION_PURSE.lancer);
    expect(yard.shipEarned()).toBeCloseTo(COMMISSION_PURSE.lancer);
  });

  it('commissions no ship past the flagship', () => {
    const fleet = getFleet();
    fleet.shipIndex.value = 2;
    fleet.authoredFallen.value = CARRIERS.length - 1;
    expect(getLine().canRecommission.value).toBe(false);
  });
});

describe('the story’s end', () => {
  beforeEach(() => boot());

  it('ends when the Dreadnought falls, and play goes on', async () => {
    const fleet = getFleet();
    const line = getLine();
    fleet.shipIndex.value = 2;
    fleet.authoredFallen.value = CARRIERS.length - 1;
    plate('flagship', 14);
    arm();
    fleet.honours.value = OVERWHELMING;
    expect(fleet.carrier.value?.def.id).toBe('carrier:dreadnought');
    line.engage();
    await seconds(1);
    expect(fleet.storyEnded.value).toBe(true);
    expect(fleet.carrier.value?.beyond).toBe(1);
    expect(line.canEngage.value).toBe(true);
  });
});
