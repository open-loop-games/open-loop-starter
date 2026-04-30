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
import {
  buildLooperSimEngine,
  BalanceBotBestOfKey,
  BalanceBotLoopLogKey,
  BalanceBotRecommendationKey,
} from '../balance/bot';
import { generatePlan, type PlannerParams } from '../balance/planner';
import { QueueKey } from '../modules';

describe('looper balance bot — wiring smoke', () => {
  it('initial plan is enqueued during engine start (queue non-empty before any tick)', () => {
    const engine = buildLooperSimEngine();
    const queue = engine.tryInject(QueueKey);
    expect(queue).toBeDefined();
    expect(queue!.items.value.length).toBeGreaterThan(0);
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

  it('RecommendationSystem is provided with autoApply and full strategy roster', () => {
    const engine = buildLooperSimEngine();
    const rec = engine.tryInject(BalanceBotRecommendationKey);
    expect(rec).toBeDefined();
    expect(rec!.autoApply.value).toBe(true);
    // Four strategies: 3 bespoke overrides (loop-window or mana-gated) +
    // 1 engine-native best-replay reactive wrapper.
    expect(rec!.strategies.length).toBe(4);
    const ids = rec!.strategies.map((s) => s.id).sort();
    expect(ids).toEqual([
      'best-replay:manaAdded',
      'farm-gold-buffer',
      'farm-mana-pool',
      'farm-talent',
    ]);
  });

  it('trainers are absent from default plans (talentOverflowThreshold: 0)', () => {
    // OL-782: trainers are strategic, not bootstrap. Canonical idle-loops
    // shape: trainers cost more than multiple explores; the player picks
    // them deliberately for stat building, not as default fill. Default
    // plans contain zero trainers regardless of slack budget — only
    // strategies with `talentOverflowThreshold > 0` engage Pass-8 trainer
    // rotation.
    const engine = buildLooperSimEngine();
    const params: PlannerParams = {
      progressionTarget: {},
      manaUpOversupplyFactor: 4.0, // huge headroom that the OLD planner
      // would have soaked into trainers; new planner ignores slack.
      tradeThreshold: 100,
      talentOverflowThreshold: 0,
    };
    const plan = generatePlan(engine, params);
    const trainerIds = new Set(['stretch', 'tend', 'listen', 'attune']);
    const trainers = plan.filter((i) => trainerIds.has(i.actionId));
    expect(trainers.length).toBe(0);
  });
});
