/**
 * Driver behavioral spec: a policy swapped for input. The same mechanics run whoever calls
 * the moves; only the answerer changes. This is what makes the stars a balance roster and a
 * character select at once. No magnitudes.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, seconds, tick } from '../sim/harness';
import { getTake } from './take';

const startAs = (driver: 'player' | 'instinct') =>
  getTake().startTake({ star: 'veteran', rating: 0, driver, seed: 1 });

describe('survivor/driver — a player calls the moves', () => {
  beforeEach(() => boot());

  it('holds the double still while nothing is held', async () => {
    startAs('player');
    const { x, y } = getTake().arena()!.player;
    await tick(30);
    expect(getTake().arena()!.player.x).toBe(x);
    expect(getTake().arena()!.player.y).toBe(y);
  });

  it('moves along the input', async () => {
    startAs('player');
    Object.assign(getTake().input, { mx: 1, my: 0 });
    await tick(30);
    const p = getTake().arena()!.player;
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBe(0);
  });

  it('moves no faster on a diagonal than along an axis', async () => {
    startAs('player');
    Object.assign(getTake().input, { mx: 1, my: 1 });
    await tick(30);
    const diag = Math.hypot(getTake().arena()!.player.x, getTake().arena()!.player.y);
    boot();
    startAs('player');
    Object.assign(getTake().input, { mx: 1, my: 0 });
    await tick(30);
    expect(diag).toBeCloseTo(getTake().arena()!.player.x, 6);
  });

  it('keeps its facing when the input is let go, so the cone stays aimed', async () => {
    startAs('player');
    Object.assign(getTake().input, { mx: 0, my: 1 });
    await tick(5);
    Object.assign(getTake().input, { mx: 0, my: 0 });
    await tick(10);
    expect(getTake().arena()!.player.facing).toBeCloseTo(Math.PI / 2, 6);
  });

  it('holds the floor at a rewrite until a page is picked, then resumes', async () => {
    startAs('player');
    Object.assign(getTake().input, { mx: 0.3, my: 0.2 });
    while (getTake().view.screen === 'take') await tick(1);
    expect(getTake().view.screen).toBe('rewrite');
    expect(getTake().view.offer.length).toBeGreaterThan(0);
    const t = getTake().arena()!.t;
    await tick(30);
    expect(getTake().arena()!.t).toBe(t);
    getTake().pickCard(0);
    expect(getTake().tally.taken).toBe(1);
    await tick(5);
    expect(getTake().arena()!.t).toBeGreaterThan(t);
  });
});

describe('survivor/driver — the star improvises', () => {
  beforeEach(() => boot());

  it('ignores the input and moves on its own', async () => {
    startAs('instinct');
    Object.assign(getTake().input, { mx: 0, my: 0 });
    await seconds(3);
    const p = getTake().arena()!.player;
    expect(Math.hypot(p.x, p.y)).toBeGreaterThan(0);
  });

  it('answers every rewrite at once, and the floor never waits', async () => {
    startAs('instinct');
    await seconds(40);
    expect(getTake().view.screen).toBe('take');
    expect(getTake().view.pendingRewrites).toBe(0);
    expect(getTake().tally.taken).toBeGreaterThan(0);
    expect(getTake().view.lastPage).not.toBeNull();
  });
});
