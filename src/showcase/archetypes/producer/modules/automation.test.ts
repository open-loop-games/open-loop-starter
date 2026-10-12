import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource, subtractResource } from '@open-loop/engine';
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
 * with the toggle on and purchased exactly nothing, because no rung had opened.
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

  it('purchases nothing while locked, however much the player can afford', async () => {
    addResource(getMass(), 1e9);
    dispatch().isActive.value = true;
    await tick(120);
    expect(fleetSize()).toBe(0);
  });
});

describe('once a rung opens', () => {
  it('purchases on its own when the toggle is on', async () => {
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

/** Own `n` Seeds for a rate, then empty the mass so nothing is affordable. */
function fundThenSpend(n: number): void {
  addResource(getMass(), 1e12);
  const seed = getClasses().getProducer('seed')!.repeatable!;
  for (let i = 0; i < n; i++) seed.purchase(1);
  subtractResource(getMass(), getMass().value);
}

describe('saving for a pick', () => {
  it('only the rule the managed rung grants may wait', () => {
    dispatch().tiers.unlock('assisted');
    expect(dispatch().waitsForCost.value).toBe(false);
    dispatch().tiers.unlock('managed');
    expect(dispatch().waitsForCost.value).toBe(true);
  });

  it('the managed rung holds cash for what it cannot yet afford, and purchases nothing meanwhile', async () => {
    fundThenSpend(10);
    dispatch().tiers.unlock('managed');
    dispatch().isActive.value = true;
    const before = fleetSize();
    await tick(1);
    expect(dispatch().savingFor.value).not.toBeNull();
    expect(fleetSize()).toBe(before);
  });

  it('the assisted rung never holds', async () => {
    fundThenSpend(10);
    dispatch().tiers.unlock('assisted');
    dispatch().isActive.value = true;
    await tick(5);
    expect(dispatch().savingFor.value).toBeNull();
  });

  it('reports no hold while the toggle is off', async () => {
    fundThenSpend(10);
    dispatch().tiers.unlock('managed');
    dispatch().isActive.value = true;
    await tick(1);
    dispatch().isActive.value = false;
    expect(dispatch().savingFor.value).toBeNull();
  });
});
