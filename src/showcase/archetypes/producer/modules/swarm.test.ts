import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { boot, tick } from '../sim/harness';
import { getClasses, getHeadlineRate, getLaunchCount, getMass, launch } from './swarm';

/**
 * What the swarm mechanic *does*. No magnitudes — every assertion here is a
 * count, an ordering, or a strict inequality, so it stays true across any
 * retune. Realized numbers print from `../balance/arc-probe.ts`.
 */

const num = (v: unknown): number => new Decimal(v as never).toNumber();

beforeEach(() => boot());

describe('hand-launch', () => {
  it('produces mass and counts the launch', () => {
    const before = num(getMass().value);
    launch();
    expect(num(getMass().value)).toBeGreaterThan(before);
    expect(num(getLaunchCount().value)).toBe(1);
  });

  it('accrues nothing on its own between launches', async () => {
    launch();
    const after = num(getMass().value);
    await tick(10);
    expect(num(getMass().value)).toBe(after);
  });
});

describe('the ladder', () => {
  it('raises the headline rate when a class is bought', () => {
    addResource(getMass(), 1_000);
    expect(num(getHeadlineRate())).toBe(0);
    getClasses().getProducer('seed')!.repeatable!.purchase(1);
    expect(num(getHeadlineRate())).toBeGreaterThan(0);
  });

  it('charges more for each successive unit of a class', () => {
    addResource(getMass(), 1_000_000);
    const seed = getClasses().getProducer('seed')!.repeatable!;
    let previous = 0;
    for (let i = 0; i < 8; i++) {
      const cost = num(seed.getCost(1));
      expect(cost).toBeGreaterThan(previous);
      previous = cost;
      seed.purchase(1);
    }
  });

  it('charges a bulk buy the same as the units bought one at a time', () => {
    addResource(getMass(), 1_000_000);
    const bulkStart = num(getMass().value);
    getClasses().getProducer('seed')!.repeatable!.purchase(5);
    const bulkSpend = bulkStart - num(getMass().value);

    boot();
    addResource(getMass(), 1_000_000);
    const singleStart = num(getMass().value);
    const seed = getClasses().getProducer('seed')!.repeatable!;
    for (let i = 0; i < 5; i++) seed.purchase(1);
    const singleSpend = singleStart - num(getMass().value);

    expect(bulkSpend).toBeCloseTo(singleSpend, 6);
  });

  it('produces continuously once owned', async () => {
    addResource(getMass(), 1_000);
    getClasses().getProducer('seed')!.repeatable!.purchase(1);
    const before = num(getMass().value);
    await tick(10);
    expect(num(getMass().value)).toBeGreaterThan(before);
  });
});

describe('the generation chain', () => {
  it('raises an owned class’s rate when a second distinct class is deployed', () => {
    addResource(getMass(), 1_000_000);
    const classes = getClasses();
    classes.getProducer('seed')!.repeatable!.purchase(1);
    const oneClass = num(classes.getProducer('seed')!.computedRate.value);

    classes.getProducer('drone')!.repeatable!.purchase(1);
    const twoClasses = num(classes.getProducer('seed')!.computedRate.value);

    expect(twoClasses).toBeGreaterThan(oneClass);
  });
});
