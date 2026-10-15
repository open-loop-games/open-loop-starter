/**
 * Take behavioral spec: one take on the floor, from Action! to CUT or a wipeout, driven tick
 * by tick on the assembled engine. No magnitudes.
 */

import { toNumber } from '@open-loop/engine';
import { beforeEach, describe, expect, it } from 'vitest';
import { ANCHORS, BEATS, RATINGS, RATING_DEPTH, SCRIPT, reelsForLevel } from '../data';
import { boot, getEngine, seconds, tick } from '../sim/harness';
import { WORLD_HALF } from './sim/arena';
import { getMeta } from './meta';
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

  it('walks the lead on at the climax and keeps rolling while it stands', async () => {
    start();
    getTake().arena()!.t = ANCHORS.takeSeconds - 0.01;
    await tick(2);
    expect(getTake().arena()!.lead).not.toBeNull();
    expect(getTake().view.screen).toBe('take');
  });

  it('calls CUT when the lead falls, and wraps', async () => {
    start();
    getTake().arena()!.t = ANCHORS.takeSeconds - 0.01;
    await tick(2);
    getTake().arena()!.lead!.hp = 0;
    await tick(2);
    expect(getTake().view.screen).toBe('wrap');
    expect(getTake().view.wrap?.end).toBe('cut');
  });

  it('sends the strike crew on if the lead outlasts the call, and they end the take', async () => {
    start();
    const strikeAt = ANCHORS.takeSeconds + SCRIPT.strikeAfter * ANCHORS.sceneSeconds;
    getTake().arena()!.t = strikeAt - 0.01;
    await tick(2);
    const a = getTake().arena()!;
    const crew = a.extras.find((e) => e.role === 'strike-crew')!;
    expect(crew).toBeDefined();
    crew.x = a.player.x;
    crew.y = a.player.y;
    await tick(2);
    expect(getTake().view.wrap?.end).toBe('struck');
  });

  it("cuts the lead's part for every mark filled before it walks on", async () => {
    start();
    const a = getTake().arena()!;
    a.marks[0]!.filled = true;
    a.t = ANCHORS.takeSeconds - 0.01;
    await tick(2);
    expect(a.lead!.hp).toBeLessThan(a.leadHp0);
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

describe('survivor/take — the ratings', () => {
  beforeEach(() => boot());

  it('starts G at the top of the curve and each rating deeper than the one before', () => {
    expect(RATING_DEPTH).toHaveLength(RATINGS.length);
    expect(RATING_DEPTH[0]).toBe(0);
    for (let r = 1; r < RATING_DEPTH.length; r++)
      expect(RATING_DEPTH[r]!).toBeGreaterThan(RATING_DEPTH[r - 1]!);
  });

  it('enters a harsher rating deeper into the scene curve', () => {
    getTake().startTake({ star: 'veteran', rating: 0, driver: 'player', seed: 1 });
    const g = getTake().view.hud.scene;
    getTake().toCallSheet();
    for (const w of Object.values(getMeta().record.wrapped)) w.value = RATINGS.length - 2;
    getEngine().tickDriver.tickOnce();
    getTake().startTake({ star: 'veteran', rating: RATINGS.length - 1, driver: 'player', seed: 1 });
    expect(getTake().view.hud.scene).toBeGreaterThan(g);
  });
});

describe('survivor/take — the rewrite ladder', () => {
  beforeEach(() => boot());

  it('derives one rung a beat, each costlier than the last', () => {
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
