import { describe, it, expect, beforeEach } from 'vitest';
import { addResource } from '@open-loop/engine';
import { bootModules, getEngine, tick, tickUntil, TICK_RATE } from '../sim/harness';
import {
  createTuningModule,
  createMatchModule,
  createEconomyModule,
  createTacticalSimModule,
  MatchKey,
  TacticalKey,
  type MatchApi,
  type TacticalApi,
} from '.';
import { BASE_HP } from '../data/tactical';

/**
 * Tactical-sim mechanics (bone #3), isolated from the AI policies — the module
 * stack here has no automation, so `spawn` is driven by hand and the field
 * only holds what the test puts there. Specs movement / targeting / combat /
 * death; the bot-vs-bot loop is `automation.test.ts`.
 */

function boot() {
  bootModules([
    createTuningModule(),
    createMatchModule(),
    createEconomyModule(),
    createTacticalSimModule(),
  ]);
}

/**
 * Mirror symmetry — two seats given identical treatment must reach identical
 * state. The archetype is bilateral by construction, so any asymmetry the sim
 * introduces on its own shows up later as a *balance* finding that is really a
 * bug: two probes' worth of split-sweep were read against a sim that quietly
 * favoured one seat. Two separate causes were found this way (a shared spawn
 * counter that gave each side a different formation offset, and sequential
 * per-side resolution that let the second side act on the first's post-move
 * positions), which is why this is specced rather than assumed.
 */
describe('skirmish tactical sim — mirror symmetry', () => {
  beforeEach(() => boot());

  it('holds both bases even after identical armies fight to exhaustion', async () => {
    match().start();
    const t = tactical();
    addResource(t.supply.a, 500);
    addResource(t.supply.b, 500);
    for (let i = 0; i < 10; i++) {
      t.spawn('a');
      t.spawn('b');
    }

    await tick(60 * TICK_RATE);

    expect(t.units.a.value.length).toBe(t.units.b.value.length);
    expect(t.baseHp.a.value).toBe(t.baseHp.b.value);
  });

  it('spreads each side across the same formation offsets', () => {
    match().start();
    const t = tactical();
    addResource(t.supply.a, 500);
    addResource(t.supply.b, 500);
    for (let i = 0; i < 5; i++) {
      t.spawn('a');
      t.spawn('b');
    }

    // Offsets are relative to each base, so compare the shape, not the absolute y.
    const offsets = (side: 'a' | 'b') =>
      t.units[side].value.map((u) => u.y - t.basePos[side].y).sort((p, q) => p - q);
    expect(offsets('a')).toEqual(offsets('b'));
  });
});
function match(): MatchApi {
  return getEngine().tryInject(MatchKey)!;
}
function tactical(): TacticalApi {
  return getEngine().tryInject(TacticalKey)!;
}

describe('skirmish tactical sim', () => {
  beforeEach(() => boot());

  it('refuses to spawn without enough supply', () => {
    match().start();
    expect(tactical().spawn('a')).toBe(false); // supply starts at 0
  });

  it('spawns a unit at the base once affordable', async () => {
    match().start();
    await tick(TICK_RATE); // 1s → supply reaches the unit cost
    expect(tactical().spawn('a')).toBe(true);
    const t = tactical();
    expect(t.units.a.value).toHaveLength(1);
    expect(t.units.a.value[0].x).toBeCloseTo(t.basePos.a.x, 5);
  });

  it('advances a unit toward the enemy base when unopposed', async () => {
    match().start();
    await tick(TICK_RATE);
    tactical().spawn('a'); // side a base is on the left; enemy base on the right
    const x0 = tactical().units.a.value[0].x;
    await tick(TICK_RATE); // 1s of movement
    expect(tactical().units.a.value[0].x).toBeGreaterThan(x0);
  });

  it('damages the enemy base when a unit reaches it', async () => {
    match().start();
    await tick(TICK_RATE);
    tactical().spawn('a');
    await tickUntil(() => tactical().baseHp.b.value < BASE_HP, 40 * TICK_RATE);
    expect(tactical().baseHp.b.value).toBeLessThan(BASE_HP);
  });

  it('resolves unit-vs-unit combat — the outnumbered side is removed', async () => {
    match().start();
    await tick(TICK_RATE * 2); // supply enough for two a-units
    tactical().spawn('a');
    tactical().spawn('a'); // 2 vs 1 for side a
    tactical().spawn('b');
    await tickUntil(() => tactical().units.b.value.length === 0, 60 * TICK_RATE);
    // Focus-fire from two attackers kills b's unit before it kills either of
    // them: b is removed, a keeps survivors.
    expect(tactical().units.b.value).toHaveLength(0);
    expect(tactical().units.a.value.length).toBeGreaterThanOrEqual(1);
  });
});
