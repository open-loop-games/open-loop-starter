/**
 * Tug balance — identity + windows + flow-band scoring (merged from the
 * former `shape.ts` + `beats.ts`). Adversarial, distribution-statistic
 * archetype; signature is the counter-matrix sharpness response curve, not
 * a single fire-time.
 *
 * **Methodology fit.** Tug runs methodology #3 (sensitivity sweep — the
 * counter-strong signature probe in `probes.ts`) + methodology #5
 * (fixed-strategy ROI — the income-upgrade ROI probe) per
 * `archetypes/BALANCING.md`. The framework-correctness archetype-dominance
 * gate in `probes.ts` (probe 6) sits orthogonal — a per-archetype safety
 * check that the methodology kit doesn't currently name, logged in
 * `archetypes/BALANCING-tug.md`.
 *
 * **Tug identity (vs single-subsystem Pure archetypes like Producer):**
 *   - Adversarial — every match is the player vs an AI policy whose income
 *     mirrors the player's. Outcome is stochastic.
 *   - Cumulative-across-matches arc — ~75min cumulative sim-time covers
 *     2–4 matches at the 30-min match limit.
 *   - Signature climax is **counter-matrix sharpness sensitivity** — the
 *     mean counter-pivots-per-match curve across a strongCounter sweep
 *     under believability-calibrated counter-vs-greed play. Not a single
 *     fire-time and not a single number; a sample curve plus a proposed-
 *     elbow scalar.
 *   - Counter matrix is data, not chain — N×N damage-type multipliers
 *     read by the per-tick combat resolver as a 2D array lookup.
 */

import { type Engine } from '@open-loop/engine';
import { LaneKey, MatchKey, MetaKey } from '../modules';
import type { BeatProbe } from '@/balance';

// ─── Identity ────────────────────────────────────────────────────────────

export interface PhaseIntent {
  id: string;
  /** Strict position in the arc. The archetype *is* this sequence. */
  order: number;
  /** One-line player-experience description. */
  intent: string;
  /** Beat id below currently expressing this phase. Mutable — a phase may
   *  migrate between beats as predicates/windows reshape. */
  currentBeatId: string | null;
}

/**
 * What's FIXED about Tug. Forks changing any of this are no longer the
 * Tug archetype — they've forked into a sibling or hybrid.
 */
export const TUG_IDENTITY = {
  archetypeId: 'tug' as const,
  /** ~75min cumulative across matches; covers the headless beat span at
   *  the 30-min match limit and ~5–25 min mean match-length. */
  arcBudgetSec: 75 * 60,
  /** Minimum content cardinality the counter-matrix depth depends on.
   *  4 archetypes is the minimum that supports a non-trivial RPS+1 counter
   *  cycle. Skeleton ships with 6 (RPS+2-axis crossed). */
  minUnitArchetypes: 4,
  /** Signature climax metric. Numeric magnitudes (sweep range, depth
   *  target) are mutable; the metric *shape* — mean counter-pivots
   *  across a `counter-matrix/strongCounter ∈ [0.5, 1.5]` sweep, with N
   *  seeds and believability calibration — is the archetype centerpiece
   *  (probe 3 `runCounterStrongSensitivityProbe` in `balance/probes.ts`). */
  signatureMetric:
    'counter-matrix sharpness sensitivity — mean counter-pivots per match curve over strongCounter ∈ [0.5, 1.5] across N=20 seeds with believability calibration',
} as const;

/**
 * Ordered player-experience phases. The order and intent of each are part
 * of the identity; the concrete beat predicate and minute-window expressing
 * each phase live in `ARC_BEATS` / `BEAT_WINDOWS` below and are mutable.
 */
export const TUG_PHASES: readonly PhaseIntent[] = [
  {
    id: 'first-unit-purchased',
    order: 1,
    intent:
      'First unit purchased — onboarding; the shop → send loop becomes concrete in under a minute',
    currentBeatId: 'beat-1',
  },
  {
    id: 'first-auto-resolve-combat',
    order: 2,
    intent:
      "First auto-resolve combat observed — validates 'set composition, watch it play out'; the archetype's defining moment",
    currentBeatId: 'beat-2',
  },
  {
    id: 'first-counter-pivot',
    order: 3,
    intent:
      'First counter-pivot — introduces the counter-matrix depth; this is where the archetype stops being an auto-battler and starts being a strategy game',
    currentBeatId: 'beat-3',
  },
  {
    id: 'first-match-completion',
    order: 4,
    intent: 'First match completion — arc half-way point; proves the match-loop closes cleanly',
    currentBeatId: 'beat-4',
  },
  {
    id: 'second-match-composition-pivot',
    order: 5,
    intent: 'Second-match composition pivot — demonstrates that learning transfers across matches',
    currentBeatId: 'beat-5',
  },
  {
    id: 'counter-mastery-demonstrated',
    order: 6,
    intent:
      'Counter-type mastery demonstrated — the player has internalized at least two counter matchups',
    currentBeatId: 'beat-6',
  },
] as const;

/**
 * Flow-band weights for the arc-scoring objective function.
 *
 * **N/A for Tug.** Flow-band scoring measures pacing in a solo-archetype
 * arc — how much of the player's continuous time is spent in flow vs
 * boredom vs frustration. Tug's arc is *adversarial* and *cumulative
 * across matches*: the within-match pacing question is answered by
 * `runMatchDurationBoundProbe` (median match length ∈ [50%, 95%] of the
 * time limit), and the cross-match pacing question is answered by the
 * methodology-#3 signature sweep. Neither is a flow-band shape, so this
 * archetype declines to author a synthetic flow score.
 *
 * If a future Tug fork instruments per-match flow telemetry (player
 * input cadence, decision-density), revisit. Not relevant for the
 * skeleton-default no-meta-progression headless sim.
 */
export const FLOW_BAND_SCORE: null = null;

// ─── Windows + beat predicates ───────────────────────────────────────────

const sec = (s: number) => s;
const min = (m: number) => m * 60;

/**
 * Phase windows in seconds. One source of truth for both the math-only
 * `runUntil` fire-time bisection and the MC distribution-statistic probes'
 * aggregate p50 windows.
 *
 * Cumulative-across-matches arc — beats 1–4 land within match 1; beats 5–6
 * span 2–4 matches' worth of cumulative sim-time. The headless sim does
 * not auto-restart matches between `match.end()` and the next
 * `match.start()`, so beat 5 requires a multi-match driver in the
 * sampler — handled by `match-driver.ts::createMatchDriverModule` which
 * subscribes to `match.on('matchEnded', ...)` and calls `match.start()`
 * on the next tick (after the auto-reset settles).
 *
 * Windows are an LLM guess on first pass — fully expect to shift them
 * during balance reconciliation (BALANCING.md § Retune vs reshape →
 * "move the phase"). Producer's B5/B6/B7 shifted 15–25 minutes during
 * prior tuning; record the same kind of shifts here if they happen.
 */
export const BEAT_WINDOWS: Record<string, [number, number]> = {
  'beat-1': [sec(0), min(1)],
  'beat-2': [min(1), min(3)],
  'beat-3': [min(5), min(15)],
  'beat-4': [min(15), min(30)],
  'beat-5': [min(30), min(50)],
  'beat-6': [min(45), min(75)],
};

/**
 * Predicates for arc-probe + math-only beat-time bisection.
 *
 * - 1 (math-only): first unit purchased — `match.unitsSentByPlayer.value
 *   >= 1`. Counter incremented inside `playerSequencer.on('start', ...)`
 *   in `match.ts`; fires the same tick the bot's first purchase
 *   dispatches into the lane.
 * - 2 (math-only): first auto-resolve combat — any unit on either side has
 *   an `engagedWith` ref set. Lane assigns engagement at the first tick a
 *   player + AI unit fall within `ENGAGE_RADIUS` of each other; the
 *   engagement set is the proxy for "first combat observed."
 * - 3 (math-only): first counter-pivot — `match.counterPivotsThisMatch.value
 *   >= 1`. Counter incremented in `match.ts` when the player
 *   buys an archetype that strong-counters the AI's current dominant
 *   archetype (cell > 1.0).
 * - 4 (MC distribution-statistic): first match completion. `match.outcome`
 *   non-null briefly inside `match.end()` then auto-reset to null;
 *   `match.inMatch.value` flips to false post-reset. Predicate uses
 *   `inMatch === false` (after first `start()` call). Distribution
 *   statistics computed from the `tug-outcome` analyzer's per-run
 *   captures (see bot.ts).
 * - 5 (math-only, bot-dependent): second-match composition pivot. Bot's
 *   policy deterministically opens with `marine` in match 1 and
 *   `wraith` in match 2, so the predicate fires the tick the bot makes
 *   match-2's first purchase.
 * - 6 (math-only): counter-mastery — `match.counterPivotsThisMatch.value
 *   >= 2` during a match (predicate evaluated mid-match before reset).
 *   Conservative — drops the original "AND match won" conjunction so
 *   the predicate is testable inside a single `runUntil` call without
 *   the post-reset capture problem.
 *
 * Fire-time predicates are evaluated once per tick before each
 * simulateTick (per `runUntil` semantics); MC predicates use
 * `runMatrixUntil`'s shared `until` over `cell.aggregate.terminationTime`
 * + analyzer captures. See `probes.ts` for the MC probe implementations.
 */
export const ARC_BEATS: BeatProbe[] = [
  {
    id: 'beat-1',
    targetWindow: BEAT_WINDOWS['beat-1']!,
    predicate: (engine) => unitsSentAtLeast(engine, 1),
  },
  {
    id: 'beat-2',
    targetWindow: BEAT_WINDOWS['beat-2']!,
    predicate: (engine) => firstCombatEngaged(engine),
  },
  {
    id: 'beat-3',
    targetWindow: BEAT_WINDOWS['beat-3']!,
    predicate: (engine) => counterPivotsAtLeast(engine, 1),
  },
  {
    id: 'beat-4',
    targetWindow: BEAT_WINDOWS['beat-4']!,
    predicate: (engine) => matchEnded(engine),
  },
  {
    id: 'beat-5',
    targetWindow: BEAT_WINDOWS['beat-5']!,
    predicate: (engine) => secondMatchPivotMade(engine),
  },
  {
    id: 'beat-6',
    targetWindow: BEAT_WINDOWS['beat-6']!,
    predicate: (engine) => counterPivotsAtLeast(engine, 2),
  },
];

// ─── Predicate helpers ────────────────────────────────────────────────────

function unitsSentAtLeast(engine: Engine, n: number): boolean {
  const match = engine.tryInject(MatchKey);
  return match ? match.unitsSentByPlayer.value >= n : false;
}

function firstCombatEngaged(engine: Engine): boolean {
  const lane = engine.tryInject(LaneKey);
  if (!lane) return false;
  const playerEngaged = lane.units.player.value.some((u) => u.engagedWith != null);
  if (playerEngaged) return true;
  return lane.units.ai.value.some((u) => u.engagedWith != null);
}

function counterPivotsAtLeast(engine: Engine, n: number): boolean {
  const match = engine.tryInject(MatchKey);
  return match ? match.counterPivotsThisMatch.value >= n : false;
}

function matchEnded(engine: Engine): boolean {
  const match = engine.tryInject(MatchKey);
  if (!match) return false;
  // After `match.end()` runs the auto-reset, `inMatch` flips to false
  // (outcome cleared to null AND fortressHp cleared to 0). The bot
  // module gates its first `match.start()` on engine boot, so once the
  // first match completes, this returns true until the bot starts
  // match 2.
  return !match.inMatch.value;
}

/**
 * Beat-5 predicate. The bot's deterministic policy opens with `marine` in
 * match 1 and `wraith` in match 2 (see `bot.ts::openArchetypeId`), so once
 * meta.matchesPlayed >= 1 (match 1 ended) AND the new match's
 * unitsSentByPlayer crosses 1 (the bot's first match-2 send dispatched),
 * the composition-pivot has occurred. Headless guarantees the "different
 * archetype" condition implicitly via the bot policy.
 */
function secondMatchPivotMade(engine: Engine): boolean {
  const meta = engine.tryInject(MetaKey);
  const match = engine.tryInject(MatchKey);
  if (!meta || !match) return false;
  return meta.matchesPlayed.value >= 1 && match.unitsSentByPlayer.value >= 1;
}

export {
  unitsSentAtLeast,
  firstCombatEngaged,
  counterPivotsAtLeast,
  matchEnded,
  secondMatchPivotMade,
};
