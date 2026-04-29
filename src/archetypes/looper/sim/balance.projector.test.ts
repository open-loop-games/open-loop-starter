/**
 * Closed-form beat-fire-time projector — engine-truth tripwire.
 *
 * Asserts the projector's `simulatedFireSeconds` matches `runUntil`'s
 * reported fire time exactly across multiple tickDeltas. Catches:
 *
 *   - Engine timing changes (tickRate shift, drain semantics shift, queue-
 *     empty detection lag drift).
 *   - Static-cost projector drift from the planner's actual budget shape.
 *   - Predicate timing changes in `beats.ts`.
 *
 * Beat-2 (first loop ends) is the validation surface: single-loop, all-zero
 * starting state, no cross-loop coupling. If a future content shift breaks
 * the EXACT match, this is where the divergence surfaces first.
 */

import { describe, it, expect } from 'vitest';
import { runUntil } from 'open-loop-engine';
import { DEFAULT_LOOPER_DATA } from '../data';
import { ARC_BEATS } from '../balance/beats';
import { buildLooperSimEngine } from '../balance/bot';
import { DEFAULT_PARAMS, generatePlan, projectActionVectors } from '../balance/planner';
import {
  arcSimulatedFireSeconds,
  createBeatPredicates,
  createSyntheticAccessor,
  createSyntheticInitialState,
  projectArc,
  projectBeatFireTime,
  resolveTunables,
  simulatedFireSeconds,
} from '../balance/projector';

// Pin both projector and sim to initialMana=250 for the EXACT-match
// contract: at the data baseline (1025 from OL-770), the plan extends past
// the small-plan regime where static-cost projection is exact — capability
// XP from Pass-1 trainers reduces subsequent action ticks mid-loop, so the
// projector overshoots actual sim by ~200ms (~4 ticks). The bounded-drift
// case is locked separately below; this contract holds for the small-plan
// envelope where static-cost == truth.
const SMALL_PLAN_OVERRIDE = { 'balance/initialMana': () => 250 };
const SMALL_PLAN_TUNING = resolveTunables({ 'balance/initialMana': 250 });

describe('looper balance projector — beat-2 closed-form vs sim (small plan)', () => {
  it('projects a finite fire time under DEFAULT_PARAMS', () => {
    const engine = buildLooperSimEngine(undefined, { tunableScope: SMALL_PLAN_OVERRIDE });
    const projection = projectBeatFireTime(engine, DEFAULT_PARAMS, 'beat-2');
    expect(projection.seconds).toBeGreaterThan(0);
    expect(projection.seconds).toBeLessThan(60);
    expect(projection.breakdown.endMode).toBe('queue-empty');
    expect(projection.breakdown.executedItems).toBe(projection.breakdown.planLength);
  });

  for (const tickDelta of [1, 0.1, 0.05]) {
    it(`simulatedFireSeconds matches runUntil exactly at tickDelta=${tickDelta}s`, () => {
      const projEngine = buildLooperSimEngine(undefined, { tunableScope: SMALL_PLAN_OVERRIDE });
      const projection = projectBeatFireTime(projEngine, DEFAULT_PARAMS, 'beat-2');
      const corrected = simulatedFireSeconds(projection, tickDelta);

      const simEngine = buildLooperSimEngine(undefined, { tunableScope: SMALL_PLAN_OVERRIDE });
      const beat2 = ARC_BEATS.find((b) => b.id === 'beat-2');
      expect(beat2).toBeDefined();
      const { terminated, elapsedSimulated } = runUntil({
        engine: simEngine,
        until: () => beat2!.predicate(simEngine),
        maxSimTime: 600,
        tickDelta,
      });
      expect(terminated).toBe('predicate');
      expect(corrected).toBe(elapsedSimulated);
    });
  }

  it('simulatedFireSeconds reflects engine-detection lag for queue-empty mode', () => {
    const engine = buildLooperSimEngine(undefined, { tunableScope: SMALL_PLAN_OVERRIDE });
    const projection = projectBeatFireTime(engine, DEFAULT_PARAMS, 'beat-2');
    expect(projection.breakdown.endMode).toBe('queue-empty');
    // 1 engine tick = 1/20 = 0.05s lag for queue-empty mode.
    const fineTick = simulatedFireSeconds(projection, 0.05);
    expect(fineTick - projection.seconds).toBeCloseTo(0.05, 6);
  });
});

// Bounded-drift contract under the OL-770 data baseline (initialMana=1025).
// Static-cost projector overshoots by ≤ 5 ticks (250ms) due to capability
// XP accumulation mid-loop reducing subsequent adjustedTicks. This is the
// option-(B) iterative-cost trigger threshold per OL-746 leaf-3a synthesis;
// if drift exceeds 5 ticks under any future content shift, that's signal
// to graduate to iterative-cost projection.
describe('looper balance projector — beat-2 bounded drift (data baseline)', () => {
  it('projector overshoots sim by ≤ 5 ticks under DEFAULT_PARAMS', () => {
    const projEngine = buildLooperSimEngine();
    const projection = projectBeatFireTime(projEngine, DEFAULT_PARAMS, 'beat-2');

    const simEngine = buildLooperSimEngine();
    const beat2 = ARC_BEATS.find((b) => b.id === 'beat-2')!;
    const { elapsedSimulated } = runUntil({
      engine: simEngine,
      until: () => beat2.predicate(simEngine),
      maxSimTime: 600,
      tickDelta: 0.05,
    });

    const corrected = simulatedFireSeconds(projection, 0.05);
    const driftSec = corrected - elapsedSimulated;
    // Projector should overshoot (slack from static-cost), not undershoot.
    expect(driftSec).toBeGreaterThanOrEqual(0);
    // 5 ticks @ 20 TPS = 250ms.
    expect(driftSec).toBeLessThanOrEqual(0.25);
  });
});

describe('looper balance projector — synthetic accessor', () => {
  it('reproduces engine plan + vectors against fresh synthetic state', () => {
    // Loop 1 boot state is the bridge between engine accessor and synthetic
    // accessor: both should produce identical plan + vectors. If they
    // diverge here, the synthetic shadow is misaligned with the engine.
    const engine = buildLooperSimEngine();
    const enginePlan = generatePlan(engine, DEFAULT_PARAMS);
    const engineVectors = projectActionVectors(engine);

    const state = createSyntheticInitialState(DEFAULT_LOOPER_DATA);
    const accessor = createSyntheticAccessor(state, DEFAULT_LOOPER_DATA);
    const synthPlan = generatePlan(accessor, DEFAULT_PARAMS);
    const synthVectors = projectActionVectors(accessor);

    expect(synthPlan).toEqual(enginePlan);
    // Compare the structural fields only — `def` is referentially identical
    // by way of LooperData being shared, so deep-equal trips on Vue refs.
    expect(synthVectors.length).toBe(engineVectors.length);
    for (let i = 0; i < synthVectors.length; i++) {
      const s = synthVectors[i]!;
      const e = engineVectors[i]!;
      expect(s.def.id).toBe(e.def.id);
      expect(s.adjustedTicks).toBe(Number(e.adjustedTicks));
      expect(s.manaPerCompletion).toBe(e.manaPerCompletion);
      expect(s.goldPerCompletion).toBe(e.goldPerCompletion);
      expect(s.poolCapacity).toBe(e.poolCapacity);
      expect(s.rewardRatio).toBe(e.rewardRatio);
      expect(s.visible).toBe(e.visible);
      expect(s.productive).toBe(e.productive);
      expect(s.passSegment).toBe(e.passSegment);
    }
  });
});

describe('looper balance projector — projectArc beat-2 (loop boundary fire)', () => {
  // Beat-2 is a loop-boundary predicate (`loop.count >= 1`). It exercises
  // projectArc's boundary-predicate path: lag = 1/tps when the boundary
  // came from queue-empty.
  const beat2Predicate = (loopCount: number) => (state: { loop: { count: number } }) =>
    state.loop.count >= loopCount;

  for (const tickDelta of [1, 0.1, 0.05]) {
    it(`projectArc beat-2 matches sim exactly at tickDelta=${tickDelta}s`, () => {
      const arc = projectArc(DEFAULT_LOOPER_DATA, DEFAULT_PARAMS, {
        breakPredicate: beat2Predicate(1),
        maxLoops: 5,
        tuning: SMALL_PLAN_TUNING,
      });
      expect(arc.endMode).toBe('predicate');
      expect(arc.fireSec).toBeGreaterThan(0);
      const corrected = arcSimulatedFireSeconds(arc, tickDelta);

      const simEngine = buildLooperSimEngine(undefined, { tunableScope: SMALL_PLAN_OVERRIDE });
      const beat2 = ARC_BEATS.find((b) => b.id === 'beat-2');
      const { terminated, elapsedSimulated } = runUntil({
        engine: simEngine,
        until: () => beat2!.predicate(simEngine),
        maxSimTime: 600,
        tickDelta,
      });
      expect(terminated).toBe('predicate');
      expect(corrected).toBe(elapsedSimulated);
    });
  }
});

describe('looper balance projector — synthetic beat predicates (structural)', () => {
  // Predicate-shape lock: each synth predicate fires iff the underlying
  // synthetic-state condition holds. Engine-side fire-time match is locked
  // separately by per-beat scenarios as the solver perturbs the surface
  // (per per-project memory: step the projector up beat-by-beat).
  const preds = createBeatPredicates(DEFAULT_LOOPER_DATA);

  // Helper — build a fresh synthetic state and let the test mutate.
  const fresh = () => createSyntheticInitialState(DEFAULT_LOOPER_DATA);

  it('beat-1 fires iff mana < initialMana', () => {
    const s = fresh();
    expect(preds['beat-1']!(s)).toBe(false);
    s.mana = 249;
    expect(preds['beat-1']!(s)).toBe(true);
  });

  it('beat-2 fires iff loop.count >= 1', () => {
    const s = fresh();
    expect(preds['beat-2']!(s)).toBe(false);
    s.loop.count = 1;
    expect(preds['beat-2']!(s)).toBe(true);
  });

  it('beat-3 fires iff any progressVar level >= 1 (xp >= 4)', () => {
    const s = fresh();
    expect(preds['beat-3']!(s)).toBe(false);
    s.progressVars.set('roam', 3); // level = floor(sqrt(3)/2) = 0
    expect(preds['beat-3']!(s)).toBe(false);
    s.progressVars.set('roam', 4); // level = floor(sqrt(4)/2) = 1
    expect(preds['beat-3']!(s)).toBe(true);
  });

  it('beat-4 fires iff manaAddedThisLoop >= 1', () => {
    const s = fresh();
    expect(preds['beat-4']!(s)).toBe(false);
    s.loop.manaAddedThisLoop = 1;
    expect(preds['beat-4']!(s)).toBe(true);
  });

  it('beat-5 fires iff trade timesCompleted >= 1', () => {
    const s = fresh();
    expect(preds['beat-5']!(s)).toBe(false);
    s.actions.set('trade', 1);
    expect(preds['beat-5']!(s)).toBe(true);
  });

  it('beat-6 requires both talent >= 1 AND loop.count >= 2', () => {
    const s = fresh();
    expect(preds['beat-6']!(s)).toBe(false);
    s.capabilities.get('vigor')!.talentXp = 4; // talent level 1
    expect(preds['beat-6']!(s)).toBe(false); // loop.count still 0
    s.loop.count = 2;
    expect(preds['beat-6']!(s)).toBe(true);
  });

  it('beat-7 fires iff any wilds-zone action timesCompleted >= 1', () => {
    const s = fresh();
    expect(preds['beat-7']!(s)).toBe(false);
    // Trail is wilds-zone (per actions.ts).
    s.actions.set('trail', 1);
    expect(preds['beat-7']!(s)).toBe(true);
  });

  it('beat-8 conjuncts loop.count >= 5, avg talentMult > 1.05, wilds completed', () => {
    const s = fresh();
    expect(preds['beat-8']!(s)).toBe(false);
    s.loop.count = 5;
    expect(preds['beat-8']!(s)).toBe(false); // talent flat
    // talentMult > 1.05 ⇒ 1 + sqrt(level)/5 > 1.05 ⇒ sqrt(level) > 0.25 ⇒ level >= 1 across all caps for avg > 1.05
    for (const cap of s.capabilities.values()) cap.talentXp = 4;
    expect(preds['beat-8']!(s)).toBe(false); // no wilds completion
    s.actions.set('trail', 1);
    expect(preds['beat-8']!(s)).toBe(true);
  });
});
