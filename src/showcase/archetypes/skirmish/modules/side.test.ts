import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import { UNIT_KINDS } from '../data/units';
import { boot, seconds } from '../sim/harness';
import { getMatch } from './match';
import { setQueue } from './policy';

const side = () => getMatch().p;
const tech = (id: string) => side().barracks.getProducer(id)!.repeatable!;
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

  it('give a kind no time until it is open, whatever its weight', () => {
    tech('chop-shop').purchase(1);
    side().queue.hexer.value = 5;
    expect(side().floorShare('hexer')).toBe(0);
    expect(side().floorShare('razor')).toBe(side().floorCount());
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
