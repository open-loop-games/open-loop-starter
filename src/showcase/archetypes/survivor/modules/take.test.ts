/**
 * Take behavioral spec: one take on the floor, from Action! to CUT or a wipeout, driven tick
 * by tick on the assembled engine. No magnitudes.
 */

import { toNumber } from '@open-loop/engine';
import { beforeEach, describe, expect, it } from 'vitest';
import { ANCHORS, BEATS, reelsForLevel } from '../data';
import { boot, getEngine, seconds, tick } from '../sim/harness';
import { WORLD_HALF } from './sim/arena';
import { getTake } from './take';

const start = (seed = 1) =>
  getTake().startTake({ star: 'veteran', rating: 0, driver: 'instinct', seed });

describe('survivor/take — the floor', () => {
  beforeEach(() => boot());

  it('waits at the call sheet and steps nothing until a take starts', async () => {
    await tick(30);
    expect(getTake().view.screen).toBe('call-sheet');
    expect(getTake().arena()).toBeNull();
  });

  it('starts with the double whole, one rig on and the floor empty', () => {
    start();
    const a = getTake().arena()!;
    expect(a.player.hp).toBe(a.player.maxHp);
    expect(a.rigs).toHaveLength(1);
    expect(a.extras).toHaveLength(0);
  });

  it('brings extras on and advances the take clock as it ticks', async () => {
    start();
    await seconds(3);
    const a = getTake().arena()!;
    expect(a.t).toBeGreaterThan(2.9);
    expect(a.extras.length).toBeGreaterThan(0);
  });

  it('downs extras and banks the reels they drop, never more than dropped', async () => {
    start();
    await seconds(30);
    const a = getTake().arena()!;
    expect(a.stats.kills).toBeGreaterThan(0);
    expect(a.stats.reelsBanked).toBeGreaterThan(0);
    expect(a.stats.reelsBanked).toBeLessThanOrEqual(a.stats.reelsDropped);
  });

  it('keeps the double on the soundstage', async () => {
    getTake().startTake({ star: 'veteran', rating: 0, driver: 'player', seed: 1 });
    Object.assign(getTake().input, { mx: 1, my: 1 });
    await seconds(15);
    const p = getTake().arena()!.player;
    expect(Math.abs(p.x)).toBeLessThanOrEqual(WORLD_HALF);
    expect(Math.abs(p.y)).toBeLessThanOrEqual(WORLD_HALF);
  });

  it('calls CUT on the clock and wraps', async () => {
    start();
    getTake().arena()!.t = ANCHORS.takeSeconds - 0.01;
    await tick(2);
    expect(getTake().view.screen).toBe('wrap');
    expect(getTake().view.wrap?.end).toBe('cut');
  });

  it('stops stepping once the take has wrapped', async () => {
    start();
    getTake().arena()!.player.hp = 0;
    await tick(2);
    const t = getTake().arena()!.t;
    await tick(30);
    expect(getTake().arena()!.t).toBe(t);
  });

  it('rebuilds the floor when the next take starts', async () => {
    start();
    await seconds(5);
    getTake().arena()!.player.hp = 0;
    await tick(2);
    getTake().toCallSheet();
    start(2);
    expect(getTake().arena()!.t).toBe(0);
    expect(getTake().arena()!.extras).toHaveLength(0);
    expect(toNumber(getTake().rewrites.level.value)).toBe(1);
  });

  it('plays the same take for the same seed', async () => {
    start(7);
    await seconds(20);
    const first = JSON.stringify(getTake().arena()!.player);
    boot();
    start(7);
    await seconds(20);
    expect(JSON.stringify(getTake().arena()!.player)).toBe(first);
  });

  it('forfeits a take in progress when a save loads', async () => {
    start();
    await seconds(2);
    const engine = getEngine();
    engine.save();
    engine.load();
    expect(getTake().view.screen).toBe('call-sheet');
    expect(getTake().arena()).toBeNull();
  });
});

describe('survivor/take — the rewrite ladder', () => {
  beforeEach(() => boot());

  it('derives one rung a beat, each dearer than the last', () => {
    const steps = BEATS.times.map((_, i) => reelsForLevel(i + 2) - reelsForLevel(i + 1));
    expect(steps).toHaveLength(BEATS.count);
    for (let i = 1; i < steps.length; i++) expect(steps[i]!).toBeGreaterThan(steps[i - 1]!);
  });

  it('fires a rewrite as reels bank', async () => {
    start();
    await seconds(40);
    expect(toNumber(getTake().rewrites.level.value)).toBeGreaterThan(1);
    expect(getTake().tally.taken).toBeGreaterThan(0);
  });
});
