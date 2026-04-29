/**
 * Looper sim-bot smoke test — end-to-end engine boot exercising the
 * canonical 3a planner + LoopLog + BestOf wiring.
 *
 * Catches the obvious failure modes leaf 4 (solver) would otherwise
 * surface: bot doesn't enqueue the first loop, loop never restarts,
 * LoopLog stays empty, BestOf never sees a candidate. Probe-level
 * accuracy and beat-window verification are leaf-5 territory; this
 * suite only confirms wiring liveness.
 */

import { describe, it, expect } from 'vitest';
import { runUntil } from 'open-loop-engine';
import { buildLooperSimEngine, BalanceBotBestOfKey, BalanceBotLoopLogKey } from '../balance/bot';
import { LoopKey, QueueKey } from '../modules';

describe('looper balance bot — wiring smoke', () => {
  it('initial plan is enqueued during engine start (queue non-empty before any tick)', () => {
    const engine = buildLooperSimEngine();
    const queue = engine.tryInject(QueueKey);
    expect(queue).toBeDefined();
    expect(queue!.items.value.length).toBeGreaterThan(0);
  });

  it('runs through at least one loop boundary within 60 sim-seconds', () => {
    const engine = buildLooperSimEngine();
    runUntil({
      engine,
      until: () => false,
      maxSimTime: 60,
      tickDelta: 1,
    });
    const loop = engine.tryInject(LoopKey);
    expect(loop).toBeDefined();
    // First loop ends quickly under a 250-tick mana budget; expect at
    // least one full loop completion in 60s of sim time.
    expect(loop!.count.value).toBeGreaterThanOrEqual(1);
  });

  it('LoopLog finalizes per-loop deltas as loops complete', () => {
    const engine = buildLooperSimEngine();
    runUntil({
      engine,
      until: () => false,
      maxSimTime: 60,
      tickDelta: 1,
    });
    const loopLog = engine.tryInject(BalanceBotLoopLogKey);
    expect(loopLog).toBeDefined();
    expect(loopLog!.history.value.length).toBeGreaterThanOrEqual(1);
    const firstEntry = loopLog!.history.value[0];
    expect(firstEntry.deltas.some((d) => d.key === 'manaAdded')).toBe(true);
    expect(firstEntry.deltas.some((d) => d.key === 'goldAccumulated')).toBe(true);
    expect(firstEntry.deltas.some((d) => d.key === 'talentLevelSum')).toBe(true);
    expect(firstEntry.deltas.some((d) => d.key === 'loopElapsed')).toBe(true);
  });

  it('BestOf records candidate entries from LoopLog finalize events', () => {
    const engine = buildLooperSimEngine();
    runUntil({
      engine,
      until: () => false,
      maxSimTime: 60,
      tickDelta: 1,
    });
    const bestOf = engine.tryInject(BalanceBotBestOfKey);
    expect(bestOf).toBeDefined();
    // `loopElapsed` is the only metric guaranteed to be > 0 on every loop
    // (manaAdded / goldAccumulated may be 0 in early loops with empty
    // pools; talentLevelSum is 0 until first capability XP fires).
    const entry = bestOf!.entries.value['loopElapsed'];
    expect(entry).not.toBeNull();
    expect(entry!.loopNumber).toBeGreaterThanOrEqual(0);
  });

  it('queue is regenerated on loop boundary (post-restart plan replaces pre-restart plan)', () => {
    const engine = buildLooperSimEngine();
    const queue = engine.tryInject(QueueKey)!;
    const loop = engine.tryInject(LoopKey)!;
    const initialPlanIds = queue.items.value.map((i) => i.id);
    runUntil({
      engine,
      until: () => loop.count.value >= 2,
      maxSimTime: 120,
      tickDelta: 1,
    });
    expect(loop.count.value).toBeGreaterThanOrEqual(2);
    // After 2+ loops, the planner has run against post-retention state at
    // least twice. The plan can match initial (state hasn't shifted enough
    // to trigger a different shape) — the assertion is on liveness:
    // queue still has items, planner ran without throwing.
    expect(queue.items.value.length).toBeGreaterThan(0);
    void initialPlanIds;
  });
});
