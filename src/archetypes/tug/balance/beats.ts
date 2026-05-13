import { type Engine } from '@open-loop/engine';
import { LaneKey, MatchKey, MetaKey } from '../modules';
import type { BeatProbe } from '@/balance';

const sec = (s: number) => s;
const min = (m: number) => m * 60;

/**
 * § 4 windows in seconds. Lifted from `archetypes/tug.md` § 4. One source of
 * truth for both the math-only `runUntil` fire-time bisection and the MC
 * distribution-statistic probes' aggregate p50 windows.
 *
 * Cumulative-across-matches arc — beats 1–4 land within match 1; beats 5–6
 * span 2–4 matches' worth of cumulative sim-time. The headless sim does
 * not auto-restart matches between `match.end()` and the next
 * `match.start()`, so beat 5 requires a multi-match driver in the
 * sampler — handled by `bot.ts::createBalanceBotModule` which subscribes
 * to `match.on('matchEnded', ...)` and calls `match.start()` on the next
 * tick (after the auto-reset settles).
 *
 * Windows are an LLM guess on first pass — fully expect to shift them
 * during balance reconciliation (BALANCING.md § Retune vs reshape →
 * "move the phase"). Producer's B5/B6/B7 shifted 15–25 minutes during
 * prior tuning; record the same kind of shifts here in commit notes if
 * they happen, and sync `archetypes/tug.md` § 4 to match.
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
 * Predicates for arc-probe + math-only beat-time bisection. § 4 triggers,
 * decoded for the headless bot:
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
 *   >= 1`. Counter incremented in `match.ts:196-208` when the player
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
 *   match-2's first purchase. Tracked via a per-bot `firstMatchOpenId`
 *   ref captured at match-2's start.
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
