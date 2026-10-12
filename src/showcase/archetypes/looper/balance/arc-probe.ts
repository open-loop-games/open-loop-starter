/**
 * Looper — arc probe. Plays the shipping game for N nights and prints each night
 * beside the spine's prediction. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/looper/balance/arc-probe.ts [nights]`
 *
 * How to read it:
 * - § Beats: when each zone, automation tier and purchase first fired.
 * - § Nights: measured work against `predictArc`. Before the first escape, `work Δ%`
 *   is the check. After it, a night ends on the wall, so read `secs` against
 *   `predEscape` instead; work then pins at the route's length.
 * - § Landmarks: the night each landmark first fell, against `LANDMARK_SCHEDULE`.
 */

import { LANDMARK_SCHEDULE, LANDMARKS, predictArc } from '../data';
import { runArc } from './_engine';

const argv = (globalThis as { process?: { argv: string[] } }).process?.argv ?? [];
const NIGHTS = Number(argv[2] ?? 14);

const t0 = performance.now();
const arc = await runArc(NIGHTS);
const pred = predictArc(arc.nights.length);

console.log('\n=== Beats ===');
for (const b of arc.beats) console.log(b);

console.log('\n=== Nights: probe (measured) vs spine (predicted) ===');
console.table(
  arc.nights.map(({ summary: s, mastery }, i) => ({
    night: s.night,
    cause: s.cause,
    secs: +s.seconds.toFixed(1),
    work: +s.work.toFixed(1),
    predWork: +pred[i].work.toFixed(1),
    'work Δ%': +(((s.work - pred[i].work) / pred[i].work) * 100).toFixed(0),
    depth: s.depth,
    predDepth: pred[i].depth,
    mastery: +mastery.toFixed(3),
    predMastery: +pred[i].mastery.toFixed(3),
    predEscape: pred[i].escapeSeconds === null ? '-' : +pred[i].escapeSeconds!.toFixed(1),
    intel: s.intel,
  })),
);

console.log('\n=== Landmarks: first night reached ===');
for (const l of LANDMARK_SCHEDULE) {
  const hit = arc.nights.find((r) => r.summary.depth >= l.depth);
  console.log(
    `${LANDMARKS[l.depth].padEnd(18)} predicted night ${l.night}, measured ${hit ? `night ${hit.summary.night}` : 'not reached'}`,
  );
}

console.log('\n=== Run ===');
console.log({
  nights: arc.nights.length,
  simSeconds: +arc.simSeconds.toFixed(1),
  anomalies: arc.anomalies,
  stalled: arc.stalled,
  wallMs: Math.round(performance.now() - t0),
});
