import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { boot, tick } from '../sim/harness';
import { getClasses, getMass } from './swarm';
import { getRevisions } from './revisions';

/**
 * What a revision *does*. The load-bearing spec is the last one: a revision
 * must be a discrete step on a count, because the spine's composition closes
 * only within a band (`../data/revisions.ts` § Balance). A revision that
 * re-fired, or that moved continuously with production, would take the
 * archetype off the closed form without reddening anything else.
 */

const num = (v: unknown): number => new Decimal(v as never).toNumber();
const earnedCount = (): number =>
  getRevisions()
    .getAll()
    .filter((entry) => entry.achievement.earned.value).length;

beforeEach(() => boot());

describe('revisions', () => {
  it('starts with none earned', () => {
    expect(earnedCount()).toBe(0);
  });

  it('earns on crossing a fleet threshold', async () => {
    addResource(getMass(), 1e9);
    const seed = getClasses().getProducer('seed')!.repeatable!;
    for (let i = 0; i < 10; i++) seed.purchase(1);
    await tick(1);
    expect(earnedCount()).toBeGreaterThan(0);
  });

  it('raises every class’s rate, not just the one that triggered it', async () => {
    addResource(getMass(), 1e12);
    const classes = getClasses();
    classes.getProducer('drone')!.repeatable!.purchase(1);
    const droneBefore = num(classes.getProducer('drone')!.computedRate.value);

    // Cross a fleet threshold using a different class entirely.
    const seed = classes.getProducer('seed')!.repeatable!;
    for (let i = 0; i < 24; i++) seed.purchase(1);
    await tick(1);

    expect(num(classes.getProducer('drone')!.computedRate.value)).toBeGreaterThan(droneBefore);
  });

  it('is a step, not a slope — holding past the threshold earns nothing further', async () => {
    addResource(getMass(), 1e12);
    const seed = getClasses().getProducer('seed')!.repeatable!;
    for (let i = 0; i < 10; i++) seed.purchase(1);
    await tick(1);
    const atThreshold = earnedCount();

    // Production continues for a long while; no count threshold is crossed.
    await tick(600);
    expect(earnedCount()).toBe(atThreshold);
  });
});
