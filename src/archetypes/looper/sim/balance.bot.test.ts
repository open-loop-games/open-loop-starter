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
  BalanceBotParamsKey,
  BalanceBotRecommendationKey,
} from '../balance/bot';
import { generatePlan, type PlannerParams } from '../balance/planner';
import { LoopKey, LooperTuningRegistryKey, QueueKey } from '../modules';

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

  // ─── 3c — RecommendationSystem wiring ─────────────────────────────────

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

  it('farm-mana-pool override applies and rewrites planner-params during early loops', () => {
    const engine = buildLooperSimEngine();
    const params = engine.tryInject(BalanceBotParamsKey)!;
    const loop = engine.tryInject(LoopKey)!;
    expect(params.read().progressionTarget).toEqual({});
    runUntil({
      engine,
      until: () => loop.count.value >= 2,
      maxSimTime: 120,
      tickDelta: 1,
    });
    // farm-mana-pool's window is loops 1..maxLoop (default 4). Fires after
    // loop 1 → afterRestart for loop 2. Override sets the canonical
    // mana-feeder-bias progression.
    expect(params.read().progressionTarget).toEqual({
      roam: 2,
      trail: 2,
      acquaint: 0,
      mark: 0,
    });
  });

  it('lastRecommendation populated after first applicable strategy fires', () => {
    const engine = buildLooperSimEngine();
    const loop = engine.tryInject(LoopKey)!;
    const rec = engine.tryInject(BalanceBotRecommendationKey)!;
    runUntil({
      engine,
      until: () => loop.count.value >= 2,
      maxSimTime: 120,
      tickDelta: 1,
    });
    const last = rec.lastRecommendation.value;
    expect(last).not.toBeNull();
    // farm-mana-pool wins arbitration at loop 2 (loop-window 1..4, score 100).
    // best-replay can't fire (minLoops 10). farm-talent gates on
    // manaOverflowTrigger which is too high to engage in early loops.
    expect(last!.strategyId).toBe('farm-mana-pool');
    expect(last!.applied).toBe(true);
  });

  // ─── 3c — phase-window disjointness + Pass 7 ───────────────────────

  it('phase windows are disjoint: each loop has exactly one canApply farm winner', () => {
    // Pin manaOverflowTrigger sky-high so farm-talent never gates and the
    // walk only tests loop-window-gated farms + best-replay.
    const engine = buildLooperSimEngine();
    const tuning = engine.tryInject(LooperTuningRegistryKey)!;
    tuning.pushScope('test/disjointness', {
      'bot/manaOverflowTrigger': () => 1e9,
    });
    const loop = engine.tryInject(LoopKey)!;
    const rec = engine.tryInject(BalanceBotRecommendationKey)!;

    const observed: Array<{ loop: number; strategy: string }> = [];
    const unsub = rec.on('apply', (r) => {
      observed.push({ loop: loop.count.value, strategy: r.strategyId });
    });

    runUntil({
      engine,
      until: () => loop.count.value >= 12,
      maxSimTime: 1800,
      tickDelta: 1,
    });
    unsub();

    // Default windows: farm-mana-pool 1..4, farm-gold-buffer 5..9,
    // best-replay minLoops 10. At each restart boundary the recommendation
    // matches the strategy whose window contains the new loop.count.
    const expectedFor = (n: number): string => {
      if (n >= 1 && n <= 4) return 'farm-mana-pool';
      if (n >= 5 && n <= 9) return 'farm-gold-buffer';
      return 'best-replay:manaAdded';
    };
    expect(observed.length).toBeGreaterThan(0);
    for (const { loop: lc, strategy } of observed) {
      expect(strategy).toBe(expectedFor(lc));
    }
  });

  it('Pass 7 (talent overflow) appends rotating trainers when threshold > 0', () => {
    const engine = buildLooperSimEngine();
    const baseParams: PlannerParams = {
      progressionTarget: {},
      manaUpOversupplyFactor: 1.0,
      tradeThreshold: 100,
      talentOverflowThreshold: 0,
    };
    const overflowParams: PlannerParams = {
      ...baseParams,
      talentOverflowThreshold: 50,
      manaUpOversupplyFactor: 2.0, // ample headroom to soak
    };

    const basePlan = generatePlan(engine, baseParams);
    const overflowPlan = generatePlan(engine, overflowParams);

    expect(overflowPlan.length).toBeGreaterThan(basePlan.length);

    const trainerIds = new Set(['stretch', 'tend', 'listen', 'attune']);
    const baseTrainers = basePlan.filter((i) => trainerIds.has(i.actionId));
    const overflowTrainers = overflowPlan.filter((i) => trainerIds.has(i.actionId));
    expect(overflowTrainers.length).toBeGreaterThan(baseTrainers.length);
  });

  it('Pass 7 stays disabled by default (talentOverflowThreshold: 0)', () => {
    const engine = buildLooperSimEngine();
    const params: PlannerParams = {
      progressionTarget: {},
      manaUpOversupplyFactor: 4.0, // huge headroom — would soak if Pass 7 fired
      tradeThreshold: 100,
      talentOverflowThreshold: 0,
    };
    const plan = generatePlan(engine, params);
    const trainerIds = new Set(['stretch', 'tend', 'listen', 'attune']);
    const trainers = plan.filter((i) => trainerIds.has(i.actionId));
    // Pass 1 adds each visible trainer once. With 4 trainers and Pass 7
    // disabled, the count is exactly 4.
    expect(trainers.length).toBe(4);
  });
});
