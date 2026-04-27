import { describe, it, expect } from 'vitest';
import { runMatrixUntil } from 'open-loop-engine';
import {
  buildTugSimEngine,
  createOutcomeAnalyzer,
  createOutcomeCapture,
  type OutcomeCapture,
} from '../balance/bot';
import { LaneKey } from '../modules';

/**
 * Sanity gate for the bilateral-symmetric sim-bot wiring. Two
 * assertions establish that:
 *
 *   (a) The player-side `createOpponentBotModule(data, 'player')` instance
 *       installs and ticks — `lane.units.player` populates within a 60s
 *       sim window. If this fails, the bot is silent (install ordering,
 *       missing dependency id, or persona's `minSpendCost` floor + slow
 *       cadence happens to gate every spend in the window — see `tech` if
 *       a future smoke test pairs against it).
 *
 *   (b) The dominant axis (`aiIncomeMultiplier`) shows monotonic response
 *       in `player-win-rate` across [0.5, 1.0, 2.0]. Low multiplier should
 *       favor player; high multiplier should favor AI. This isn't a tuner
 *       acceptance — N=3 seeds means binomial CI is wide — but the
 *       direction signal is what catches per-side perturbation isolation
 *       failures (e.g., aiIncomeMultiplier accidentally bound to player
 *       chain too).
 *
 * Smoke-only: probes/tuner cover convergence at higher seed counts. This
 * file's bar is "wiring is structurally sound for long runs."
 */
describe('tug bilateral sim-bot smoke', () => {
  it('player-side opponent bot purchases units within 60s sim', () => {
    // Use a symmetric persona pair (mass vs mass at parity income) for
    // the wiring sanity gate. The post-OL-711 sim default
    // (counter-vs-greed at 0.711 multiplier) is intentionally asymmetric:
    // greed sits silent ~28s saving for refinery-1 and its first
    // marines die in the player's onslaught at lane center, so AI's
    // lane is plausibly empty at t=60s. mass-vs-mass at parity has both
    // bots spamming from t=5s — bilateral install + tick + dispatch are
    // verified without persona-asymmetry confounding the signal.
    const engine = buildTugSimEngine({
      balance: {
        aiIncomeMultiplier: 1.0,
        opponentPersona: { player: 'mass', ai: 'mass' },
      },
    });
    for (let i = 0; i < 60; i++) engine.loop.simulateTick(1);
    const lane = engine.tryInject(LaneKey)!;
    expect(lane.units.player.value.length).toBeGreaterThan(0);
    expect(lane.units.ai.value.length).toBeGreaterThan(0);
  });

  it('aiIncomeMultiplier monotonically inverts player-win-rate', () => {
    let activeCapture: OutcomeCapture | null = null;
    const seeds = [1, 2, 3];
    const winRateAt = (mult: number): number => {
      const result = runMatrixUntil({
        cells: [
          {
            name: `mult=${mult}`,
            buildEngine: () => buildTugSimEngine({ balance: { aiIncomeMultiplier: mult } }),
            analyzers: (engine) => {
              const cap = createOutcomeCapture(engine);
              activeCapture = cap;
              return [createOutcomeAnalyzer(cap)];
            },
            tickDelta: 1.0,
          },
        ],
        seeds,
        until: () => activeCapture?.firstMatchEnded ?? false,
        maxSimTime: 15 * 60, // 15min cap; matches typically resolve faster
      });
      return result.cells[0]!.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0;
    };

    const wrLow = winRateAt(0.5);
    const wrMid = winRateAt(1.0);
    const wrHigh = winRateAt(2.0);

    // Direction-only assertion (binomial CI is wide at N=3): low ≥ mid ≥ high,
    // with at least one strict inequality. If all three sit at the same
    // value (typically 0.0), perturbation isolation has failed — both bots
    // are feeling the same income shift, OR neither bot is purchasing.
    expect(wrLow).toBeGreaterThanOrEqual(wrMid);
    expect(wrMid).toBeGreaterThanOrEqual(wrHigh);
    expect(wrLow).toBeGreaterThan(wrHigh);
  }, 60_000);
});
