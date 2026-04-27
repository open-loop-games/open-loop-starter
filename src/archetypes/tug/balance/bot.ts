import { type Analyzer, type Engine } from 'open-loop-engine';
import { MatchKey } from '../modules';
import { createOpponentBotModule } from '../modules/opponent-bot';
import { createTugEngine } from '../boot';
import { DEFAULT_TUG_DATA } from '../data';
import { applyTugOverrides, type TugOverrides } from '../data/overrides';
import { createMatchDriverModule } from './match-driver';

/**
 * Sim-engine harness for Tier-C balance probes + tuner. Owns:
 *
 * 1. `buildTugSimEngine(overrides?)` — builds a started, bot-driven engine
 *    instance with bilateral opponent bots + multi-match orchestration.
 * 2. `OutcomeCapture` + `createOutcomeAnalyzer` — per-run match-outcome
 *    capture, used by `runMatrixUntil`'s analyzer hook.
 *
 * **Bilateral-symmetric bot pattern.** The production AI policy
 * (`createOpponentBotModule`, side-parameterized) is installed on BOTH
 * sides for sim. This collapses player-vs-bot policy asymmetry into
 * "production AI plays itself," so the only structural asymmetry knobs
 * left are the side-keyed bound modifiers (`aiIncomeMultiplier` etc.).
 * That's exactly what the Tier-C signature probe (`ai-difficulty-symmetry`)
 * wants to bisect against. Replaces the previous bespoke
 * `createBalanceBotModule` whose composition-pivot policy diverged from
 * the AI's policy and made tuner output un-interpretable.
 *
 * See `open-loop-engine/docs/candidate-primitives.md` § "Tier-C bilateral-
 * symmetric sim-bot pattern" for the candidate graduation entry.
 */

let engineCounter = 0;

/**
 * Build a started, sim-bot-driven engine for the Tug archetype.
 *
 * Mirrors Ambient's `buildAmbientSimEngine` shape line-for-line: unique
 * `persistenceNamespace` per call (essential for `runMatrixUntil`
 * parallelism — collisions are sneaky), `selectMod('sci-fi-armada')`,
 * `engine.start()` then `engine.stop()` so the live `tickRate` doesn't
 * fire (solver iterations advance via `engine.loop.simulateTick(tickDelta)`
 * from `runUntil` / `runMatrixUntil`), and finally `match.start()` to
 * kick off match 1.
 *
 * **Sim default: `opponentPersona = { player: 'counter', ai: 'greed' }`.**
 * The OL-721 game-AI variety study + OL-711 session-2 parity-stalemate
 * diagnostic converged on this calibrated pair: greed's `top-tier` picker
 * concentrates composition on the AI side → `pickCounterAware` on the
 * player side fires non-zero counter-pivots (unblocks the `meanCp = 0`
 * finding). Greed-vs-counter also gives `bisectTuner` a smooth
 * `aiIncomeMultiplier` response surface — greed scales late, counter
 * holds steady, so the [0.4, 0.6] win-rate band has a continuous landing
 * spot. Caller overrides win: pass
 * `{ balance: { opponentPersona: { player: 'mass', ai: 'greed' } } }` to
 * sweep secondary calibration pairs.
 *
 * The `createMatchDriverModule` handles match-2+ restarts; cumulative-arc
 * probes (beats 5, 7) work transparently inside a single `runMatrixUntil`
 * cell.
 */
export function buildTugSimEngine(
  overrides?: TugOverrides,
  options?: { maxDeltaTime?: number },
): Engine {
  const namespace = `tug-balance-${++engineCounter}`;
  const mergedOverrides: TugOverrides = {
    ...overrides,
    balance: {
      ...overrides?.balance,
      opponentPersona: {
        player: 'counter',
        ai: 'greed',
        ...overrides?.balance?.opponentPersona,
      },
    },
  };
  // Compute data once locally so the `'player'` opponent-bot module factory
  // can close over it. `createTugEngine` re-applies the same overrides
  // internally to build its own data instance — `applyTugOverrides` is a
  // deep merge and idempotent under repeat application, so this is safe and
  // negligibly more expensive than threading data through the boot factory.
  const data = applyTugOverrides(DEFAULT_TUG_DATA, mergedOverrides);
  const { engine } = createTugEngine(mergedOverrides, {
    persistenceNamespace: namespace,
    extraModules: [createOpponentBotModule(data, 'player'), createMatchDriverModule()],
    maxDeltaTime: options?.maxDeltaTime,
  });
  engine.selectMod('sci-fi-armada');
  engine.start();
  engine.stop();
  engine.tryInject(MatchKey)!.start();
  return engine;
}

// ─── Outcome capture for runMatrixUntil distribution-statistic probes ────

/**
 * Per-run capture of `'matchEnded'` payloads. Subscribes during the
 * cell's analyzer factory call (which closes over the freshly-built
 * engine) and accumulates first-match + cross-match aggregates that the
 * `tug-outcome` analyzer surfaces through `summarize()`.
 *
 * **Why this pattern over `cell.runs[i].engine.tryInject(MatchKey)`:**
 * `cell.runs[i]` has no `engine` field — the harness builds the engine
 * fresh per `(cell, seed)` and discards it. AND `match.end()` calls
 * `reset.reset()` synchronously, which wipes `outcome.value` back to
 * `null`. The matchEnded event fires BEFORE the reset (per `match.ts`
 * lines 153–158), so subscribing here is the only way to read the
 * pre-reset outcome.
 *
 * `firstMatch*` fields snapshot the first match only — used by the
 * `ai-difficulty-symmetry` and `match-duration-bound` probes, which
 * terminate after match 1. `matchesPlayed` / `matchesWon` /
 * `totalCounterPivots` accumulate across all matches in the run — used
 * by counter-mastery / cross-match probes.
 */
export interface OutcomeCapture {
  firstMatchEnded: boolean;
  firstMatchOutcome: 'player-win' | 'ai-win' | 'time-limit' | null;
  firstMatchCounterPivots: number;
  firstMatchUnitsSent: number;
  firstMatchLengthSec: number;
  matchesPlayed: number;
  matchesWon: number;
  totalCounterPivots: number;
  totalMatchTimeSec: number;
}

export function createOutcomeCapture(engine: Engine): OutcomeCapture {
  const capture: OutcomeCapture = {
    firstMatchEnded: false,
    firstMatchOutcome: null,
    firstMatchCounterPivots: 0,
    firstMatchUnitsSent: 0,
    firstMatchLengthSec: 0,
    matchesPlayed: 0,
    matchesWon: 0,
    totalCounterPivots: 0,
    totalMatchTimeSec: 0,
  };
  const match = engine.tryInject(MatchKey)!;
  match.on('matchEnded', (payload) => {
    capture.matchesPlayed += 1;
    capture.totalCounterPivots += payload.counterPivots;
    capture.totalMatchTimeSec += payload.elapsedSec;
    if (payload.outcome === 'player-win') capture.matchesWon += 1;
    if (!capture.firstMatchEnded) {
      capture.firstMatchEnded = true;
      capture.firstMatchOutcome = payload.outcome;
      capture.firstMatchCounterPivots = payload.counterPivots;
      capture.firstMatchUnitsSent = payload.unitsSent;
      capture.firstMatchLengthSec = payload.elapsedSec;
    }
  });
  return capture;
}

/**
 * Analyzer wrapping an `OutcomeCapture`. Numeric metrics are aggregated
 * by `runMatrixUntil`'s `aggregateUntilCell` into
 * `cell.aggregate.metrics['tug-outcome.<key>']`; the `firstMatchOutcome`
 * string is dropped during aggregation but preserved per-run via
 * `cell.runs[i].analyzerResults[0].metrics.firstMatchOutcome` (useful
 * for per-cell breakdowns when the average isn't enough).
 *
 * **Win-rate read pattern:** `cell.aggregate.metrics['tug-outcome.isFirstPlayerWin'].avg`
 * directly gives the Bernoulli p̂ across the cell's seeds (mean of 0/1s).
 *
 * **Match-length read pattern:** `cell.aggregate.terminationTime.p50`
 * is preferred when the until predicate is `() => !match.inMatch.value`
 * (ends on first match completion). `tug-outcome.firstMatchLengthSec.avg`
 * is the analyzer-side cross-check.
 */
export function createOutcomeAnalyzer(capture: OutcomeCapture): Analyzer {
  return {
    name: 'tug-outcome',
    summarize: () => {
      const isPlayerWin = capture.firstMatchOutcome === 'player-win' ? 1 : 0;
      const isAiWin = capture.firstMatchOutcome === 'ai-win' ? 1 : 0;
      const isTimeLimit = capture.firstMatchOutcome === 'time-limit' ? 1 : 0;
      return {
        name: 'tug-outcome',
        metrics: {
          firstMatchOutcome: capture.firstMatchOutcome ?? 'none',
          isFirstPlayerWin: isPlayerWin,
          isFirstAiWin: isAiWin,
          isFirstTimeLimit: isTimeLimit,
          // Composite "player score" treating timeout as 0.5 (neutral —
          // neither side won). With deterministic bots producing binary
          // win/loss per seed and time-limit at the transition multiplier,
          // `playerScore.avg` is the smoothest bisection reading: it reads
          // 1.0 in player-favored multipliers, 0.5 at the transition (where
          // matches stalemate to the time limit), 0.0 in AI-favored ones.
          // `bisectTuner` targets this against 0.5.
          playerScore: isPlayerWin + 0.5 * isTimeLimit,
          firstMatchCounterPivots: capture.firstMatchCounterPivots,
          firstMatchUnitsSent: capture.firstMatchUnitsSent,
          firstMatchLengthSec: capture.firstMatchLengthSec,
          matchesPlayed: capture.matchesPlayed,
          matchesWon: capture.matchesWon,
          totalCounterPivots: capture.totalCounterPivots,
          totalMatchTimeSec: capture.totalMatchTimeSec,
        },
        issues: [],
      };
    },
  };
}
