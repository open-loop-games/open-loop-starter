/**
 * Cross-archetype balance toolkit: what a probe prints, over the engine's
 * balance harness it imports directly.
 *
 * Runners and their types (`runBeatProbe`, `runUntil`, `runSensitivity`,
 * `replayLive`, `Beat`) come from `@open-loop/engine`. This kit deliberately
 * does not re-export them: it owns the *balance* vocabulary, not the balance
 * harness's, and a partial re-export only made one subsystem arrive from two
 * paths. A cost curve is the engine's `Formula.exponential`, `linear` or
 * `polynomial` in the purchase count.
 *
 * What is here:
 *
 * - `renderArcTable` — the arc as a markdown table, one row per beat.
 * - `beatResultsOf` — fire times an arc probe recorded itself, as the
 *   `BeatResult`s `renderArcTable` takes.
 * - `seedBatch`, `spreadOf`, `formatSpread` — seeded multi-run statistics, for
 *   a spine whose closed form stops at a stochastic leg.
 *
 * A time prints with `formatClock` from `@/composables/useFormatting`.
 */

export { renderArcTable } from './report';

export { beatResultsOf, formatSpread, seedBatch, spreadOf, type BeatFireTimes } from './spread';
