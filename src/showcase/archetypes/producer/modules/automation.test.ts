import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { boot, getEngine, tick } from '../sim/harness';
import { getClasses, getMass } from './swarm';
import { DispatchKey } from './automation';

/**
 * What the dispatch ladder *does*. The first spec is the one that matters: a
 * ladder which never withholds is a divergence, not an adoption
 * (`.claude/rules/archetype-authoring.md` § Conformance), and the only way to
 * know it withholds is to fund the economy, run it, and watch nothing happen.
 *
 * That is not hypothetical here — the first arc walkthrough ran eight sim-hours
 * with the toggle on and bought exactly nothing, because no rung had opened.
 */

const num = (v: unknown): number => new Decimal(v as never).toNumber();
const fleetSize = (): number =>
  getClasses()
    .getAll()
    .reduce((total, entry) => total + num(entry.producer.ownedCount.value), 0);

const dispatch = () => getEngine().tryInject(DispatchKey)!;

beforeEach(() => boot());

describe('the ladder withholds', () => {
  it('starts on the manual rung', () => {
    expect(dispatch().tiers.currentTierId.value).toBe('manual');
  });

  it('buys nothing while locked, however much the player can afford', async () => {
    addResource(getMass(), 1e9);
    dispatch().isActive.value = true;
    await tick(120);
    expect(fleetSize()).toBe(0);
  });
});

describe('once a rung opens', () => {
  it('buys on its own when the toggle is on', async () => {
    addResource(getMass(), 1e9);
    dispatch().tiers.unlock('assisted');
    dispatch().isActive.value = true;
    await tick(60);
    expect(fleetSize()).toBeGreaterThan(0);
  });

  it('stays idle while the toggle is off', async () => {
    addResource(getMass(), 1e9);
    dispatch().tiers.unlock('assisted');
    dispatch().isActive.value = false;
    await tick(60);
    expect(fleetSize()).toBe(0);
  });

  it('reaches the rung on its own once the fleet is large enough', async () => {
    addResource(getMass(), 1e12);
    const seed = getClasses().getProducer('seed')!.repeatable!;
    for (let i = 0; i < 25; i++) seed.purchase(1);
    await tick(1);
    expect(dispatch().tiers.hasReached('assisted')).toBe(true);
  });
});
