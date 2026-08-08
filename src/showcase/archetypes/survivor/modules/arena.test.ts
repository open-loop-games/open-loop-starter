/**
 * Arena behavioural spec — what the floor DOES, driven tick by tick on the real
 * assembled engine.
 *
 * No magnitudes: how many specimens, how much damage and how fast are balance
 * questions that `../balance/arena-probe.ts` prints. This layer asserts the
 * mechanics exist and are wired to each other, which is what stays true across
 * every retune.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ArenaKey } from './arena';
import { boot, getEngine, tick } from '../sim/harness';

function arena() {
  const api = getEngine().tryInject(ArenaKey);
  if (!api) throw new Error('survivor/arena did not provide ArenaKey');
  return api;
}

describe('survivor/arena', () => {
  beforeEach(() => boot());

  it('starts a run with the operator alive and the floor empty', () => {
    arena().startRun('generalist');
    const s = arena().state.value;
    expect(s.time).toBe(0);
    expect(s.specimens).toHaveLength(0);
    expect(s.operator.hp).toBeGreaterThan(0);
    expect(arena().outcome.value).toBe('running');
  });

  it('opens with exactly one device installed', () => {
    arena().startRun('generalist');
    expect(arena().state.value.devices).toHaveLength(1);
  });

  it('spawns specimens once the run is under way', async () => {
    arena().startRun('generalist');
    await tick(200);
    expect(arena().state.value.specimens.length).toBeGreaterThan(0);
  });

  it('advances run time as it ticks', async () => {
    arena().startRun('generalist');
    await tick(100);
    expect(arena().state.value.time).toBeGreaterThan(0);
  });

  it('kills specimens and banks motes from them', async () => {
    arena().startRun('generalist');
    await tick(600);
    const stats = arena().state.value.stats;
    expect(stats.kills).toBeGreaterThan(0);
    expect(stats.motesDropped).toBeGreaterThan(0);
    expect(stats.motesBanked).toBeGreaterThan(0);
  });

  it('never banks more motes than it dropped', async () => {
    arena().startRun('generalist');
    await tick(600);
    const stats = arena().state.value.stats;
    expect(stats.motesBanked).toBeLessThanOrEqual(stats.motesDropped);
  });

  it('keeps the operator inside the map bounds', async () => {
    arena().startRun('kinetic');
    await tick(600);
    const { x, y } = arena().state.value.operator;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
  });

  it('holds live specimens under the declared entity budget', async () => {
    arena().startRun('generalist');
    await tick(1200);
    // The annulus bounds density; a breach here means spawning stopped being
    // bounded, which is a structural failure rather than a hard difficulty.
    expect(arena().state.value.specimens.length).toBeLessThanOrEqual(400);
  });

  it('stops stepping once a run has ended', async () => {
    arena().startRun('generalist');
    arena().endRun('survived');
    const before = arena().state.value.time;
    await tick(100);
    expect(arena().state.value.time).toBe(before);
  });

  it('rebuilds the floor when a new run starts', async () => {
    arena().startRun('generalist');
    await tick(400);
    expect(arena().state.value.stats.kills).toBeGreaterThan(0);
    arena().startRun('reactive');
    expect(arena().state.value.stats.kills).toBe(0);
    expect(arena().state.value.time).toBe(0);
  });

  it('is reproducible for a fixed seed', async () => {
    arena().startRun('generalist');
    await tick(300);
    const first = arena().state.value.stats.kills;
    arena().startRun('generalist');
    await tick(300);
    expect(arena().state.value.stats.kills).toBe(first);
  });
});
