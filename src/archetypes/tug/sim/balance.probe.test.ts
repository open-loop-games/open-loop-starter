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

/**
 * Tier-C balance regression locks — pin the post-OL-711 calibration so
 * future bot/balance changes that drift readings surface in CI rather
 * than silently shifting the game-feel target.
 *
 * Two classes of lock:
 *
 *   1. Static data invariants — roster shape, counter-matrix shape,
 *      calibrated `aiIncomeMultiplier`. Cheap; always run.
 *   2. Sim distribution-statistic locks — fixed-seed `runMatrixUntil`
 *      and math-only `runUntil` regressions on the bot system. Slow
 *      (≈10s); kept to a single MC sample (N=5) and one math-only fire-
 *      time read so the file fits inside the broader test budget. The
 *      comprehensive sweep lives behind `pnpm balance:probes:tug`.
 *
 * **Calibration source.** OL-711 closure 2026-04-27, sim default pair
 * `counter` (player) vs `greed` (ai) at `aiIncomeMultiplier = 0.711`.
 * `bisectTuner` converged in 6 iterations against `playerScore.avg = 0.5`
 * (timeouts treated as 0.5; deterministic bots produce a step transition
 * through the target band).
 *
 * **Known limitations** (documented here so locks don't pin them as
 * acceptance bars):
 *
 *   - `meanCp` reads 0 reliably because no current persona saves for
 *     counter units (siege-tank cost 150 unaffordable on baseline 5/sec
 *     income at counter's tempo-first posture). Counter-pivot probe
 *     (`pnpm balance:probes:tug` probe 3) reports 0 across perturbations
 *     by structure, not by data drift.
 *   - Match resolutions cluster around two attractors: fast (~3-5min)
 *     wins or full game time-limit (30min) stalemates. There is no
 *     "match resolves at 22min" zone with deterministic bots — adding
 *     stochastic persona elements (a future ticket) would smooth this.
 */

const TUG_LOCK_SEEDS = [1, 2, 3, 4, 5];
const MAX_SIM = 35 * 60;

let activeCapture: OutcomeCapture | null = null;

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

  it('aiIncomeMultiplier is the OL-711 calibrated 0.711', () => {
    // Tuner output 2026-04-27 against sim pair counter-vs-greed.
    // bisectTuner converged in 6 iterations to playerScore = 0.500.
    expect(balance.aiIncomeMultiplier).toBeCloseTo(0.711, 3);
  });

  it('matchTimeLimitMinutes provides the duration-probe ceiling', () => {
    expect(balance.matchTimeLimitMinutes).toBeGreaterThan(0);
  });

  it('default opponent persona is counter on both slots', () => {
    expect(balance.opponentPersona.player).toBe('counter');
    expect(balance.opponentPersona.ai).toBe('counter');
  });
});

describe('tug Tier-C balance locks — math-only fire-time', () => {
  it('beat-1 (first unit purchased) fires within first cadence window', () => {
    const engine = buildTugSimEngine();
    const beat = ARC_BEATS.find((b) => b.id === 'beat-1')!;
    const result = runUntil({
      engine,
      until: () => beat.predicate(engine),
      maxSimTime: MAX_SIM,
      tickDelta: 1.0,
    });
    expect(result.terminated).toBe('predicate');
    // Both bots' first-purchase happens around the first cadence trigger
    // — counter saves nothing, mass cheapest-affordable, both fire by
    // ~5s. Lock at <= 30s so persona-cadence drift surfaces if a future
    // edit slows first-purchase by 5×+.
    expect(result.elapsedSimulated).toBeLessThanOrEqual(30);
  }, 30_000);
});

describe('tug Tier-C balance locks — MC distribution at calibrated multiplier', () => {
  it('playerScore lands in [0.4, 0.6] band at calibrated aiIncomeMultiplier', () => {
    const result = runMatrixUntil({
      cells: [
        {
          name: 'calibrated',
          buildEngine: () => buildTugSimEngine(),
          analyzers: (engine) => {
            const cap = createOutcomeCapture(engine);
            activeCapture = cap;
            return [createOutcomeAnalyzer(cap)];
          },
          tickDelta: 1.0,
        },
      ],
      seeds: TUG_LOCK_SEEDS,
      until: () => activeCapture?.firstMatchEnded ?? false,
      maxSimTime: MAX_SIM,
    });
    const cell = result.cells[0]!;
    const playerScore = cell.aggregate.metrics['tug-outcome.playerScore']?.avg ?? -1;
    // playerScore composite: 1.0 = player-win, 0.5 = time-limit (neutral),
    // 0.0 = ai-win. At the calibrated multiplier, all seeds time-limit
    // (deterministic stalemate) → playerScore = 0.5 exactly. Band
    // tolerance allows post-recalibration drift.
    expect(playerScore).toBeGreaterThanOrEqual(0.4);
    expect(playerScore).toBeLessThanOrEqual(0.6);
  }, 60_000);
});
