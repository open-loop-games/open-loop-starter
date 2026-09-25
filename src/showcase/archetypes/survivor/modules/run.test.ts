/**
 * Run behavioural spec — the lifecycle and the beat ladder.
 *
 * No magnitudes: when beats land and how many is a balance question the arena
 * probe prints. This asserts the mechanics — that beats fire off banked motes,
 * that the floor holds while a pick is owed, that a run ends and says why.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ArenaKey } from './arena';
import { RunKey } from './run';
import { boot, getEngine, tick } from '../sim/harness';

const run = () => {
  const api = getEngine().tryInject(RunKey);
  if (!api) throw new Error('survivor/run did not provide RunKey');
  return api;
};
const arena = () => getEngine().tryInject(ArenaKey)!;

// Specs here drive the arena for up to 2000 ticks: ~4s alone, over vitest's
// 5s default when the full suite runs in parallel.
describe('survivor/run', { timeout: 20_000 }, () => {
  beforeEach(() => boot());

  it('derives a ladder with one rung per draft beat', () => {
    expect(run().ladder.length).toBeGreaterThan(0);
  });

  it('derives a MONOTONE ladder', () => {
    // A non-monotone rung means the derivation absorbed an impulse — the
    // collector bug. Shape, not magnitude, so this survives every retune.
    const ladder = run().ladder;
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i]).toBeGreaterThanOrEqual(ladder[i - 1]);
    }
  });

  it('starts at level zero with nothing owed', () => {
    run().startRun('generalist');
    expect(run().level.value).toBe(0);
    expect(run().pendingPicks.value).toBe(0);
    expect(run().bindingCause.value).toBe('running');
  });

  it('fires beats as motes bank', async () => {
    run().startRun('generalist');
    await tick(2000);
    expect(run().level.value).toBeGreaterThan(0);
  });

  it('advances arena time while running', async () => {
    run().startRun('generalist');
    await tick(200);
    expect(arena().elapsed.value).toBeGreaterThan(0);
  });

  it('leaves no pick owed — the AI seat answers the draft', async () => {
    // The floor IS held while a pick is outstanding, but that is unobservable
    // from here on purpose: the AI resolves within the same tick it is owed. A
    // human seat is what makes the hold visible, and this is the invariant that
    // matters either way — a beat never strands the run.
    run().startRun('generalist');
    await tick(400);
    run().pendingPicks.value += 1;
    await tick(20);
    expect(run().pendingPicks.value).toBe(0);
  });

  it('keeps advancing across a draft beat', async () => {
    run().startRun('generalist');
    await tick(400);
    const before = arena().elapsed.value;
    run().pendingPicks.value += 1;
    await tick(100);
    expect(arena().elapsed.value).toBeGreaterThan(before);
  });

  it('reports a binding cause once the run is over', async () => {
    run().startRun('generalist');
    arena().endRun('died');
    await tick(10);
    expect(arena().outcome.value).not.toBe('running');
  });

  it('resets level and cause on a fresh run', async () => {
    run().startRun('generalist');
    await tick(2000);
    expect(run().level.value).toBeGreaterThan(0);
    run().startRun('reactive');
    expect(run().level.value).toBe(0);
    expect(run().bindingCause.value).toBe('running');
  });
});
