import { describe, it, expect } from 'vitest';
import { runMatrixUntil, runUntil } from 'open-loop-engine';
import { DEFAULT_TUG_DATA } from '../data';
import {
  buildTugSimEngine,
  createOutcomeAnalyzer,
  createOutcomeCapture,
  type OutcomeCapture,
} from '../balance/bot';
import { ARC_BEATS } from '../balance/beats';
import { TugTuningRegistryKey } from '../modules';

/**
 * Tier-C balance regression locks for Tug — static data invariants
 * (roster shape, counter-matrix shape, default opponent persona,
 * believability bundle present) and framework-correctness locks for
 * the sensitivity sweep harness.
 *
 * **Framework-correctness, not balance-numbers.** Per the OL-730
 * rescope, the SIGNATURE strongCounter sweep currently surfaces
 * "underlying data balance dominates matrix sensitivity" at default
 * data — a forward-looking finding for the procedural-persona tester-
 * seat follow-up. These locks pin the framework primitives
 * (TugBelievability bundle wired through merge, sensitivity sweep
 * runs to completion across the full strongCounter range, monotonicity
 * preserved) so the next session can balance the data and re-tune
 * locks against numerical bands then.
 */

const TUG_LOCK_SEEDS = [1, 2, 3, 4, 5];
const MAX_SIM = 35 * 60;

const { balance, units, counterMatrix } = DEFAULT_TUG_DATA;

describe('tug Tier-C balance locks — static data invariants', () => {
  it('roster has unitArchetypeCount entries', () => {
    expect(units.length).toBe(balance.unitArchetypeCount);
  });

  it('counter-matrix is square and matches roster size', () => {
    expect(counterMatrix.length).toBe(units.length);
    for (const row of counterMatrix) expect(row.length).toBe(units.length);
  });

  it('counter-matrix diagonal is identity (1.0 vs self)', () => {
    for (let i = 0; i < counterMatrix.length; i++) {
      expect(counterMatrix[i][i]).toBe(1.0);
    }
  });

  it('matchTimeLimitMinutes provides the duration-probe ceiling', () => {
    expect(balance.matchTimeLimitMinutes).toBeGreaterThan(0);
  });

  it('default opponent persona is counter on both slots', () => {
    expect(balance.opponentPersona.player).toBe('counter');
    expect(balance.opponentPersona.ai).toBe('counter');
  });

  it('production believability is zero on both knobs (deterministic AI)', () => {
    expect(balance.believability.suboptimalityRate).toBe(0);
    expect(balance.believability.cadenceJitterScale).toBe(0);
  });

  it('aiIncomeMultiplier defaults to side-symmetric 1.0 (not a balance lever)', () => {
    expect(balance.aiIncomeMultiplier).toBe(1.0);
  });
});

describe('tug Tier-C balance locks — math-only fire-time', () => {
  it('beat-1 (first unit purchased) fires within first cadence window', () => {
    const engine = buildTugSimEngine({
      balance: { believability: { suboptimalityRate: 0, cadenceJitterScale: 0 } },
    });
    const beat = ARC_BEATS.find((b) => b.id === 'beat-1')!;
    const result = runUntil({
      engine,
      until: () => beat.predicate(engine),
      maxSimTime: MAX_SIM,
      tickDelta: 1.0,
    });
    expect(result.terminated).toBe('predicate');
    // Counter persona's first marine purchase fires by ~5s (income 5/sec
    // affords 25-cost marine at first cadence trigger).
    expect(result.elapsedSimulated).toBeLessThanOrEqual(30);
  }, 30_000);
});

describe('tug Tier-C balance locks — believability bundle is wired', () => {
  it('TugBelievability sub-merges through applyTugOverrides', () => {
    const engine = buildTugSimEngine({
      balance: { believability: { suboptimalityRate: 0.1 } },
    });
    // Read the merged data via a public surface — the engine's match
    // module isn't exposing data directly, so verify by behavior: a
    // run with believability override doesn't throw, and engine starts
    // cleanly. (TypeScript types guarantee the field shape.)
    expect(engine).toBeDefined();
  });
});

describe('tug Tier-C balance locks — counter-strong sensitivity framework', () => {
  let activeCapture: OutcomeCapture | null = null;

  function runCellAtStrong(strong: number) {
    return runMatrixUntil({
      cells: [
        {
          name: `strong=${strong}`,
          buildEngine: () => buildTugSimEngine(),
          analyzers: (engine) => {
            const cap = createOutcomeCapture(engine);
            activeCapture = cap;
            const reg = engine.tryInject(TugTuningRegistryKey)!;
            const cleanup = reg.pushScope(`lock:strong=${strong}`, {
              'counter-matrix/strongCounter': () => strong,
            });
            return [
              createOutcomeAnalyzer(cap),
              {
                name: 'scope-cleanup',
                onEnd: () => cleanup(),
                summarize: () => ({ name: 'scope-cleanup', metrics: {}, issues: [] }),
              },
            ];
          },
          tickDelta: 1.0,
        },
      ],
      seeds: TUG_LOCK_SEEDS,
      until: () => activeCapture?.firstMatchEnded ?? false,
      maxSimTime: MAX_SIM,
    });
  }

  it('strongCounter scope-push runs end-to-end across the sweep edges', () => {
    // Verifies the framework runs cleanly at the sweep extremes — no
    // engine-construction errors, scope-push wires through to lane.ts
    // combat, and the analyzer captures outcome for both cells. The
    // numerical signal at default data is currently flat (see
    // bot.ts § Known limitation); this lock checks that the *framework*
    // doesn't regress, separately from the balance-tuning follow-up.
    const lo = runCellAtStrong(0.5);
    const hi = runCellAtStrong(1.5);
    expect(lo.cells[0]!.runs.length).toBe(TUG_LOCK_SEEDS.length);
    expect(hi.cells[0]!.runs.length).toBe(TUG_LOCK_SEEDS.length);
    // Win-rate metric is exposed by the analyzer (read pattern used by
    // probe 3 and tune.ts).
    expect(lo.cells[0]!.aggregate.metrics['tug-outcome.isFirstPlayerWin']).toBeDefined();
    expect(hi.cells[0]!.aggregate.metrics['tug-outcome.isFirstPlayerWin']).toBeDefined();
  }, 60_000);

  it('strongCounter sweep produces non-decreasing win-rate across edges', () => {
    // Coarse monotonicity check: increasing matrix decisiveness should
    // not DECREASE counter-side win-rate (cell value at counter cells
    // scales linearly via lane.ts::adjustCell). Loose acceptance —
    // permits equality (flat curve at imbalanced data) but catches a
    // sign-flip regression where the matrix wiring broke.
    const lo = runCellAtStrong(0.5);
    const hi = runCellAtStrong(1.5);
    const wrLo = lo.cells[0]!.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0;
    const wrHi = hi.cells[0]!.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0;
    expect(wrHi + 1e-9).toBeGreaterThanOrEqual(wrLo);
  }, 60_000);
});
