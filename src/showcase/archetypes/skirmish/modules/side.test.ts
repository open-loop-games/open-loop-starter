import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import { UNITS, UNIT_KINDS } from '../data/units';
import { boot, seconds } from '../sim/harness';
import { getMatch } from './match';
import { productionMix, setQueue } from './policy';
import { PLAYER_PERSONA } from '../data/contracts';

const side = () => getMatch().p;
const tech = (id: string) => side().barracks.getProducer(id)!.repeatable!;
const charter = () => side().tier.getPurchasable('charter')!;
const trained = (kind: 'razor' | 'rigger') => toNumber(side().reserve[kind].value);

function rich(): void {
  side().scrip.value = new Decimal(1e6);
  side().aether.value = new Decimal(1e6);
}

describe('training floors', () => {
  beforeEach(() => {
    boot();
    getMatch().start();
    rich();
  });

  it('wait for a tech floor before a plain floor can stand', () => {
    expect(side().floors.visible.value).toBe(false);
    tech('chop-shop').purchase(1);
    expect(side().floors.visible.value).toBe(true);
  });

  it('open a kind with its tech floor, which is a floor itself', async () => {
    expect(side().opened('razor')).toBe(false);
    tech('chop-shop').purchase(1);
    expect(side().opened('razor')).toBe(true);
    expect(side().floorCount()).toBe(1);
    await seconds(30);
    expect(trained('razor')).toBeGreaterThan(0);
  });

  it('climb one price ladder, tech floors included', () => {
    const first = toNumber(tech('chop-shop').getCost(1));
    tech('chop-shop').purchase(1);
    const second = toNumber(side().floors.getCost(1));
    expect(second).toBeGreaterThan(first);
    expect(toNumber(tech('drone-garage').getCost(1))).toBeCloseTo(second);
    side().floors.purchase(1);
    expect(toNumber(tech('drone-garage').getCost(1))).toBeGreaterThan(second);
  });

  it('split their time between the open kinds by the queue', async () => {
    tech('chop-shop').purchase(1);
    tech('drone-garage').purchase(1);
    side().floors.purchase(1);
    side().queue.razor.value = 1;
    side().queue.rigger.value = 3;
    await seconds(60);
    expect(trained('rigger')).toBeGreaterThan(2 * trained('razor'));
  });

  it('take as long per unit as the unit is worth', async () => {
    side().econ.getProducer('ley-tap')!.repeatable!.purchase(1);
    tech('chop-shop').purchase(1);
    tech('talisman-parlor').purchase(1);
    tech('drone-garage').purchase(1);
    charter().purchase();
    tech('black-clinic').purchase(1);
    side().queue.hexer.value = 0;
    side().queue.rigger.value = 0;
    await seconds(60);
    const enforcers = toNumber(side().reserve.enforcer.value);
    expect(trained('razor') / enforcers).toBeCloseTo(UNITS.enforcer.value, 0);
  });

  it('give a kind no time until it is open, whatever its weight', () => {
    tech('chop-shop').purchase(1);
    side().queue.hexer.value = 5;
    expect(side().floorShare('hexer')).toBe(0);
    expect(side().floorShare('razor')).toBe(side().floorCount());
  });
});

describe('hustler nodes', () => {
  beforeEach(() => {
    boot();
    getMatch().start();
    rich();
  });
  const narrows = () => side().econ.getProducer('hustler-narrows')!;

  it('hire in a district only while the seat owns it', () => {
    expect(narrows().repeatable!.visible.value).toBe(false);
    getMatch().owner[0]!.value = 'p';
    expect(narrows().repeatable!.purchase(1)).toBeTruthy();
    expect(side().hustlers()).toBe(6);
  });

  it('scatter when the rival takes the district', async () => {
    getMatch().owner[0]!.value = 'p';
    narrows().repeatable!.purchase(1);
    getMatch().owner[0]!.value = 'e';
    await seconds(1);
    expect(toNumber(narrows().count.value)).toBe(0);
  });

  it('start each ladder at the same first price, and hire where it is cheapest', () => {
    const home = side().econ.getProducer('hustler')!.repeatable!;
    expect(toNumber(home.getCost(1))).toBeCloseTo(toNumber(narrows().repeatable!.getCost(1)));
    home.purchase(1);
    getMatch().owner[0]!.value = 'p';
    expect(side().nextHustler()).toBe(narrows());
  });
});

describe('the charter', () => {
  beforeEach(() => {
    boot();
    getMatch().start();
    rich();
  });

  it('waits for two floors', () => {
    tech('chop-shop').purchase(1);
    expect(charter().canPurchase.value).toBe(false);
    side().floors.purchase(1);
    expect(charter().canPurchase.value).toBe(true);
  });

  it('opens the black clinic and the tier-two research', () => {
    tech('chop-shop').purchase(1);
    tech('drone-garage').purchase(1);
    side().research.getPurchasable('smartlink-rounds')!.purchase();
    expect(tech('black-clinic').visible.value).toBe(false);
    expect(side().research.getPurchasable('dermal-weave')!.visible.value).toBe(false);
    charter().purchase();
    expect(side().chartered()).toBe(true);
    expect(tech('black-clinic').visible.value).toBe(true);
    expect(side().research.getPurchasable('dermal-weave')!.visible.value).toBe(true);
  });
});

describe("the policy's mix", () => {
  it('bends only the kinds that counter something; a generalist keeps its share', () => {
    const seen = { razor: 10, hexer: 0, rigger: 0, enforcer: 0 };
    const unbent = productionMix(PLAYER_PERSONA, undefined);
    const bent = productionMix(PLAYER_PERSONA, seen);
    expect(bent.enforcer).toBeCloseTo(unbent.enforcer);
    expect(bent.rigger).toBeGreaterThan(unbent.rigger);
  });
});

describe("the policy's queue", () => {
  beforeEach(() => {
    boot();
    getMatch().start();
    rich();
  });

  it('hands an aether kind its time back to razors while the taps cannot feed it', () => {
    side().econ.getProducer('ley-tap')!.repeatable!.purchase(1);
    tech('chop-shop').purchase(1);
    tech('talisman-parlor').purchase(1);
    for (let i = 0; i < 6; i++) side().floors.purchase(1);
    side().aether.value = new Decimal(0);
    const wantsHexers = Object.fromEntries(UNIT_KINDS.map((k) => [k, k === 'hexer' ? 1 : 0]));
    setQueue(side(), wantsHexers as Record<(typeof UNIT_KINDS)[number], number>);
    expect(side().queue.razor.value).toBeGreaterThan(0);
    expect(side().queue.hexer.value).toBeGreaterThan(0);
  });
});
