import { type Analyzer, type Engine } from '@open-loop/engine';
import { LaneKey, MatchKey } from '../modules';
import { createTugEngine } from '../boot';
import type { TugBelievability } from '../data/types';
import type { PersonaKey } from '../data/personality';
import { createMatchDriverModule } from './_match-driver';

/**
 * Scratch-engine builder over the balance harness, for probes + sweeps. Owns:
 *
 * 1. `buildTugScratchEngine(options?)` — builds a started engine with an
 *    automated player on each side + multi-match orchestration.
 * 2. `OutcomeCapture` + `createOutcomeAnalyzer` — per-run match-outcome
 *    capture, used by `runMatrixUntil`'s analyzer option.
 *
 * **Bilateral-symmetric automated players.** The production AI policy
 * (`createOpponentBotModule`, side-parameterized) is installed on BOTH
 * sides for a headless run. This collapses player-vs-AI policy asymmetry
 * into "production AI plays itself," so the only structural asymmetry
 * left is the per-side persona choice.
 *
 * **The headless matchup is chosen to exercise the design property, not to
 * mirror production.** Production runs human-vs-counter (no headless
 * equivalent — a headless run has no human), so any "mirror production"
 * framing for the headless default is a category error. The signature probe
 * (counter-strong-sensitivity) measures matrix decisiveness, which
 * requires a *concentrating* opponent for the counter persona to detect
 * dominance and fire counters. `counter`-vs-`greed` is the calibrated
 * pair: greed's `top-tier` picker concentrates composition on the
 * highest-cost archetype, exercising the matrix; greed's ~20s eco-save
 * phase plus higher believability noise (suboptimality + cadence
 * jitter) produces match-outcome variance that responds to
 * strongCounter sweep.
 *
 * **Believability calibration applies independently** of matchup choice,
 * per `composition-cookbook/parameterized-personality.md` §
 * Believability-calibration discipline. It is a headless-run parameter that
 * adds decision noise to the deterministic policy. Production has
 * `believability: 0/0` (deterministic AI, predictable for the human
 * player); the headless default is `0.20/0.25`.
 *
 * See `candidate-primitives.md` § bilateral-
 * symmetric sim-bot pattern for the candidate graduation entry.
 */

let engineCounter = 0;

const DEFAULT_SIM_BELIEVABILITY: TugBelievability = {
  suboptimalityRate: 0.2,
  cadenceJitterScale: 0.25,
};

export interface TugScratchEngineOptions {
  /** Player-side persona. Default `'counter'`. */
  player?: PersonaKey;
  /** AI-side persona. Default `'greed'`. The counter-vs-greed pairing
   *  exercises the matrix sharpness signature: greed concentrates
   *  composition; counter fires against it. */
  ai?: PersonaKey;
  /** Believability calibration applied to BOTH sides. Default is the
   *  cookbook bundle (suboptimality 0.20, cadence jitter 0.25);
   *  math-only probes pass `{ suboptimalityRate: 0, cadenceJitterScale: 0 }`
   *  for determinism. Partial overrides fill from the default. */
  believability?: Partial<TugBelievability>;
  /** Raise the loop's `maxDeltaTime` cap — headless probes advance in coarse
   *  steps that the default cap would clamp. */
  maxDeltaTime?: number;
}

/**
 * Build a started engine for the Tug archetype, with an automated player on
 * each side.
 *
 * It uses a unique `persistenceNamespace` per call (essential for `runMatrixUntil`
 * parallelism — collisions are sneaky), `selectMod('sci-fi-armada')`,
 * `engine.start()` then `engine.stop()` so the live `intervalRate` doesn't
 * fire (solver iterations advance via `engine.tickDriver.advanceTime(tickDelta)`
 * from `runUntil` / `runMatrixUntil`), and finally `match.start()` to
 * kick off match 1.
 *
 * **Headless default: `{ player: 'counter', ai: 'greed' }`.** Counter-vs-greed:
 * greed's `top-tier` picker concentrates composition on the highest-cost
 * affordable archetype; counter's matrix-aware picker fires against it.
 *
 * **Known limitation — SIGNATURE matchup needs balance work.** At the
 * current data balance, counter-vs-greed is heavily AI-favored; there's
 * no balanced range where `strongCounter` sweep produces a smooth win-
 * rate response. The underlying data balance is filed as a follow-up
 * — the procedural-persona tester seat (cookbook
 * `procedural-personas.md`) is the canonical balance-discovery automated
 * player. This builder implements the framework correctly; the signature
 * probe reports a flat curve + null proposed value at current data,
 * which IS the actionable signal: "data balance dominates strongCounter
 * sensitivity."
 *
 * The `createMatchDriverModule` handles match-2+ restarts; cumulative-arc
 * probes (beats 5, 6) work transparently inside a single `runMatrixUntil`
 * cell.
 */
export function buildTugScratchEngine(options?: TugScratchEngineOptions): Engine {
  const namespace = `tug-balance-${++engineCounter}`;
  const believability: TugBelievability = {
    suboptimalityRate:
      options?.believability?.suboptimalityRate ?? DEFAULT_SIM_BELIEVABILITY.suboptimalityRate,
    cadenceJitterScale:
      options?.believability?.cadenceJitterScale ?? DEFAULT_SIM_BELIEVABILITY.cadenceJitterScale,
  };
  const playerPersona: PersonaKey = options?.player ?? 'counter';
  const aiPersona: PersonaKey = options?.ai ?? 'greed';
  const { engine } = createTugEngine({
    persistenceNamespace: namespace,
    extraModules: [createMatchDriverModule()],
    maxDeltaTime: options?.maxDeltaTime,
    autoSaveInterval: 0,
    modules: {
      player: { persona: playerPersona, believability },
      ai: { persona: aiPersona, believability },
    },
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
 * `cell.runs[i]` has no `engine` field — the balance harness builds the engine
 * fresh per `(cell, seed)` and discards it. AND `match.end()` calls
 * `reset.reset()` synchronously, which wipes `outcome.value` back to
 * `null`. The matchEnded event fires BEFORE the reset (see `end()` in
 * `match.ts`), so subscribing here is the only way to read the
 * pre-reset outcome.
 *
 * `firstMatch*` fields snapshot the first match only — used by the
 * match-duration probe, which terminates after match 1.
 * `matchesPlayed` / `matchesWon` / `totalCounterPivots` accumulate
 * across all matches in the run — used by counter-mastery / cross-match
 * probes.
 */
export interface OutcomeCapture {
  firstMatchEnded: boolean;
  firstMatchOutcome: 'player-win' | 'ai-win' | 'time-limit' | null;
  firstMatchCounterPivots: number;
  firstMatchUnitsSent: number;
  firstMatchLengthSec: number;
  /** Per-side, per-archetype spawn counts during match 1. `archetypeId →
   *  count`. Side keys both populated; absent archetype ids read as 0
   *  via `?? 0` at consumer sites. Used by the per-archetype dominance
   *  probe to compute composition share in winning matches. */
  firstMatchSpawnsByArchetype: Record<'player' | 'ai', Record<string, number>>;
  /** Per-side, per-archetype death counts during match 1. Mirror of spawns;
   *  death counts the side of the killed unit (i.e. `deaths.player.marine`
   *  is how many of the player's marines died). Combat is all-pairs in
   *  the lane, so attacker attribution isn't single-source — deaths are
   *  the cleaner survivability indicator. */
  firstMatchDeathsByArchetype: Record<'player' | 'ai', Record<string, number>>;
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
    firstMatchSpawnsByArchetype: { player: {}, ai: {} },
    firstMatchDeathsByArchetype: { player: {}, ai: {} },
    matchesPlayed: 0,
    matchesWon: 0,
    totalCounterPivots: 0,
    totalMatchTimeSec: 0,
  };
  const match = engine.tryInject(MatchKey)!;
  const lane = engine.tryInject(LaneKey)!;
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
  // Spawns + deaths only accumulate during match 1. Lane events keep firing
  // for match-2+ runs (driven by createMatchDriverModule) but those are
  // dropped — first-match aggregates are the contract for predicate-bounded
  // probes. Cross-match composition tracking would be a future addition.
  lane.on('unit-spawned', ({ side, archetypeId }) => {
    if (capture.firstMatchEnded) return;
    const bucket = capture.firstMatchSpawnsByArchetype[side];
    bucket[archetypeId] = (bucket[archetypeId] ?? 0) + 1;
  });
  lane.on('unit-killed', ({ side, archetypeId }) => {
    if (capture.firstMatchEnded) return;
    const bucket = capture.firstMatchDeathsByArchetype[side];
    bucket[archetypeId] = (bucket[archetypeId] ?? 0) + 1;
  });
  return capture;
}

/**
 * Analyzer wrapping an `OutcomeCapture`. Numeric metrics are aggregated
 * by `runMatrixUntil`'s `aggregateUntilCell` into
 * `cell.aggregate.metrics['tug-outcome.<key>']`; the `firstMatchOutcome`
 * string is dropped during aggregation but preserved per-run via
 * `cell.runs[i].analyzerSummaries[0].metrics.firstMatchOutcome` (useful
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
    id: 'tug-outcome',
    summarize: () => {
      const isPlayerWin = capture.firstMatchOutcome === 'player-win' ? 1 : 0;
      const isAiWin = capture.firstMatchOutcome === 'ai-win' ? 1 : 0;
      const isTimeLimit = capture.firstMatchOutcome === 'time-limit' ? 1 : 0;
      const metrics: Record<string, number | string> = {
        firstMatchOutcome: capture.firstMatchOutcome ?? 'none',
        isFirstPlayerWin: isPlayerWin,
        isFirstAiWin: isAiWin,
        isFirstTimeLimit: isTimeLimit,
        // Composite "player score" treating timeout as 0.5 (neutral).
        // Diagnostic only — no probe currently reads it.
        playerScore: isPlayerWin + 0.5 * isTimeLimit,
        firstMatchCounterPivots: capture.firstMatchCounterPivots,
        firstMatchUnitsSent: capture.firstMatchUnitsSent,
        firstMatchLengthSec: capture.firstMatchLengthSec,
        matchesPlayed: capture.matchesPlayed,
        matchesWon: capture.matchesWon,
        totalCounterPivots: capture.totalCounterPivots,
        totalMatchTimeSec: capture.totalMatchTimeSec,
      };
      // Per-archetype spawn / death counts. Flat metric keys
      // `tug-outcome.spawns.<side>.<archetypeId>` and `.deaths.<side>.<id>`
      // so `runMatrixUntil`'s aggregator averages them across seeds. The
      // per-archetype-dominance probe reads these directly to compute the
      // composition-share histogram per Cartesian cell.
      // Conditional emit: a winning-match gets a separate `.spawnsInWin`
      // bucket so the dominance aggregator can weight by win-only shares
      // (Direct Strike tier-list framing — pick_freq × win_rate). Losing
      // and timeout matches contribute 0 to the win bucket but still
      // contribute to total spawns.
      for (const side of ['player', 'ai'] as const) {
        for (const [id, count] of Object.entries(capture.firstMatchSpawnsByArchetype[side])) {
          metrics[`spawns.${side}.${id}`] = count;
          metrics[`spawnsInWin.${side}.${id}`] = isPlayerWin === 1 ? count : 0;
        }
        for (const [id, count] of Object.entries(capture.firstMatchDeathsByArchetype[side])) {
          metrics[`deaths.${side}.${id}`] = count;
        }
      }
      return {
        id: 'tug-outcome',
        metrics,
        issues: [],
      };
    },
  };
}
