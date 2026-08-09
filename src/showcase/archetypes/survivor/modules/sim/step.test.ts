/**
 * Step spec — what the floor DOES over a tick, driven through the pure step.
 *
 * `stepArena` is pure over `(state, params, nav, fields)`, so this drives it
 * directly rather than through the assembled engine: every case here needs a
 * body placed at a known distance, which a live floor cannot be asked to
 * arrange. No magnitudes — damage and density numbers belong to the probes.
 */

import { describe, expect, it } from 'vitest';
import { buildNav } from '../arena';
import { ARENA_BALANCE } from '../../data/arena';
import { SPLITTER_FRAGMENTS } from '../../data/specimens';
import { computeFields } from './steering';
import { createArenaState, stepArena } from './step';
import type { ArenaParams, ArenaState, Specimen } from './types';

const params: ArenaParams = {
  engage: 1,
  eta: 1,
  speedMul: 1,
  dpsMul: 1,
  toughnessMul: 1,
  metaSurvival: 1,
  metaCollect: 1,
  metaYield: 1,
  random: () => 0.5,
};

const nav = buildNav();

/** Step the floor once, rebuilding fields the way the module's caller does. */
function step(state: ArenaState, dt = 0.2) {
  return stepArena(state, dt, params, nav, computeFields(state, nav, state.time));
}

/**
 * A body placed `distance` units to the operator's right, with the HP given.
 * Inside `killRadius` by default, so the despawn filter's dwell clock is exempt
 * and the case under test is the only thing that can remove it.
 */
function bodyAt(state: ArenaState, overrides: Partial<Specimen> = {}): Specimen {
  const hp = overrides.hp ?? 1;
  const s: Specimen = {
    id: state.nextId++,
    tierId: 'mote-fly',
    x: state.operator.x + 50,
    y: state.operator.y,
    hp,
    spawnHp: hp,
    speed: 0,
    contactDamage: 0,
    moteYield: 1,
    spawnedAt: state.time,
    reached: false,
    ...overrides,
  };
  state.specimens.push(s);
  return s;
}

describe('splitter fragments', () => {
  it('leaves live fragments on the floor when a splitter dies', () => {
    const state = createArenaState(params);
    bodyAt(state, { tierId: 'splitter', hp: 1, moteYield: 1 });

    step(state);

    const fragments = state.specimens.filter((s) => s.tierId === 'splitter-fragment');
    expect(fragments).toHaveLength(SPLITTER_FRAGMENTS);
    // The point of the tier: fragments are BODIES, a density spike the spawn
    // curve does not express (`../../data/specimens.ts` § Each tier moves a
    // different term). A fragment born at or below zero HP is not a body.
    for (const f of fragments) expect(f.hp).toBeGreaterThan(0);
  });

  it('does not credit a fragment as a kill on the tick its parent died', () => {
    const state = createArenaState(params);
    bodyAt(state, { tierId: 'splitter', hp: 1, moteYield: 1 });

    step(state);

    expect(state.stats.kills).toBe(1);
  });
});

describe('damage accounting', () => {
  it('books damage that killed a body as converted', () => {
    const state = createArenaState(params);
    bodyAt(state, { hp: 1 });

    step(state);

    expect(state.stats.kills).toBe(1);
    expect(state.stats.damageConverted).toBeGreaterThan(0);
    expect(state.stats.damageWasted).toBe(0);
  });

  it('books damage spent on a body that leaves the floor alive as wasted', () => {
    const state = createArenaState(params);
    // Tough enough to survive the tick, and parked outside `killRadius` so the
    // dwell clock — already expired — is what removes it.
    const survivor = bodyAt(state, {
      hp: 1e6,
      x: state.operator.x + ARENA_BALANCE.killRadius * 1.2,
      spawnedAt: -1000,
    });
    // Hurt it by hand: the point is what accounting does with a wounded body
    // that leaves, not which device wounded it.
    survivor.hp -= 500;

    step(state);

    expect(state.specimens).toHaveLength(0);
    expect(state.stats.kills).toBe(0);
    expect(state.stats.bodiesWasted).toBe(1);
    expect(state.stats.damageWasted).toBeGreaterThanOrEqual(500);
  });

  it('accounts for every point of damage the devices delivered', () => {
    const state = createArenaState(params);
    // Long enough to spawn, kill, and dwell bodies out under the real loop, so
    // all three destinations are populated.
    for (let i = 0; i < 400; i++) step(state);

    const delivered = Object.values(state.stats.devices).reduce((n, d) => n + d.damage, 0);
    const standing = state.specimens.reduce((n, s) => n + Math.max(0, s.spawnHp - s.hp), 0);
    const accounted = state.stats.damageConverted + state.stats.damageWasted + standing;

    expect(delivered).toBeGreaterThan(0);
    // Converted / wasted / still-standing partition delivered damage. If they
    // stop summing, a body is leaving the floor through a path that does not
    // book what was spent on it, and every waste figure silently under-reports.
    expect(accounted).toBeCloseTo(delivered, 6);
  });

  it('books nothing for an untouched body that dwells out', () => {
    const state = createArenaState(params);
    bodyAt(state, {
      hp: 1e6,
      x: state.operator.x + ARENA_BALANCE.killRadius * 1.2,
      spawnedAt: -1000,
    });

    step(state);

    expect(state.specimens).toHaveLength(0);
    expect(state.stats.bodiesWasted).toBe(0);
    expect(state.stats.damageWasted).toBe(0);
  });
});
