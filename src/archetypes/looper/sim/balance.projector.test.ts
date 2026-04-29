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
import { ARC_BEATS } from '../balance/beats';
import { buildLooperSimEngine } from '../balance/bot';
import { DEFAULT_PARAMS } from '../balance/planner';
import { projectBeatFireTime, simulatedFireSeconds } from '../balance/projector';

describe('looper balance projector — beat-2 closed-form vs sim', () => {
  it('projects a finite fire time under DEFAULT_PARAMS', () => {
    const engine = buildLooperSimEngine();
    const projection = projectBeatFireTime(engine, DEFAULT_PARAMS, 'beat-2');
    expect(projection.seconds).toBeGreaterThan(0);
    expect(projection.seconds).toBeLessThan(60);
    expect(projection.breakdown.endMode).toBe('queue-empty');
    expect(projection.breakdown.executedItems).toBe(projection.breakdown.planLength);
  });

  for (const tickDelta of [1, 0.1, 0.05]) {
    it(`simulatedFireSeconds matches runUntil exactly at tickDelta=${tickDelta}s`, () => {
      const projEngine = buildLooperSimEngine();
      const projection = projectBeatFireTime(projEngine, DEFAULT_PARAMS, 'beat-2');
      const corrected = simulatedFireSeconds(projection, tickDelta);

      const simEngine = buildLooperSimEngine();
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
    const engine = buildLooperSimEngine();
    const projection = projectBeatFireTime(engine, DEFAULT_PARAMS, 'beat-2');
    expect(projection.breakdown.endMode).toBe('queue-empty');
    // 1 engine tick = 1/20 = 0.05s lag for queue-empty mode.
    const fineTick = simulatedFireSeconds(projection, 0.05);
    expect(fineTick - projection.seconds).toBeCloseTo(0.05, 6);
  });
});
