/**
 * Producer: arc probe. Plays the shipping game headless and prints when each
 * beat fired beside the spine's projection, the channel each gap between
 * perceptible beats falls in, and the end state against the projection.
 * Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/producer/balance/arc-probe.ts [minutes]`
 *
 * How to read it:
 * - § spine: the derived ratio and the solved cost step.
 * - § beats: realized, projected (tier openings, grades and hires only), the gap
 *   since the previous beat and its flow channel. A perceptible beat is anything
 *   the player is shown as new: a tier, a memo, a milestone, a grade, a desk.
 * - § occupancy: the arc's time weighted by the gap each beat closed. Boredom or
 *   worse inside the horizon is content running out.
 * - § end state: counts and income against the projection. The projection
 *   evaluates the same buy order in closed form, so a gap here is the engine and
 *   the spine disagreeing, not noise.
 */

import { Decimal, classifyFlowChannel } from '@open-loop/engine';
import {
  CLASS_COST_STEP,
  COST_RATIO,
  DOUBLING_PURCHASES,
  LADDER,
  LADDER_TARGET,
  OPENER_COST,
  OPENER_RATE,
  projectArc,
} from '../data';
import { fmt, runArc } from './_engine';

const HORIZON = Number(process.argv[2] ?? 30) * 60;

const run = await runArc({ seconds: HORIZON });
const { beats, firm } = run;

console.log('── spine ──');
console.log(
  `m = ${COST_RATIO.toFixed(4)} (doubles every ${DOUBLING_PURCHASES.toFixed(2)} buys) · a0 = $${OPENER_COST} · r0 = $${OPENER_RATE}/s`,
);
console.log(
  `cost step ×${CLASS_COST_STEP.toFixed(3)} solved for top tier at ${fmt(LADDER_TARGET)} · rate step ×${LADDER.rateStep.toFixed(3)}`,
);

const projection = projectArc(LADDER, HORIZON);
const projected = new Map<string, number>();
for (const b of projection.beats) {
  const m = /^open t(\d)/.exec(b.label);
  if (m) projected.set(`open t${m[1]}`, b.t);
  const g = /^grade (\S+)/.exec(b.label);
  if (g) projected.set(`grade ${g[1]}`, b.t);
  const h = /^hire (\S+)/.exec(b.label);
  if (h) projected.set(`hire ${h[1]}`, b.t);
}

console.log('\n── beats (realized · projected · gap since previous · channel) ──');
let prev = 0;
for (const b of beats) {
  const keyOpen = /^open (t\d)/.exec(b.label);
  const keyGrade = /^grade (\S+)/.exec(b.label);
  const keyHire = /^d:(.+)/.exec(b.key);
  let p: number | undefined;
  if (keyOpen) p = projected.get(`open ${keyOpen[1]}`);
  if (keyGrade) p = projected.get(`grade ${keyGrade[1]}`);
  if (keyHire) p = projected.get(`hire ${keyHire[1]}`);
  const gap = b.t - prev;
  prev = b.t;
  console.log(
    `${fmt(b.t).padStart(7)}  ${(p !== undefined ? fmt(p) : '').padStart(7)}  +${gap.toFixed(1).padStart(6)}s ${classifyFlowChannel(gap).padEnd(11)} ${b.label}`,
  );
}

// Perceptible-beat channel occupancy: time weighted by the gap each beat closed.
const occupancy = new Map<string, number>();
prev = 0;
for (const b of beats) {
  const gap = b.t - prev;
  prev = b.t;
  const ch = classifyFlowChannel(gap);
  occupancy.set(ch, (occupancy.get(ch) ?? 0) + gap);
}
const tail = HORIZON - prev;
occupancy.set(classifyFlowChannel(tail), (occupancy.get(classifyFlowChannel(tail)) ?? 0) + tail);
console.log('\n── channel occupancy of the gaps between perceptible beats ──');
for (const [ch, s] of occupancy)
  console.log(`${ch.padEnd(11)} ${((100 * s) / HORIZON).toFixed(1)}%`);
console.log(`trailing silence after last beat: ${fmt(tail)}`);

console.log('\n── end state ──');
const counts = firm.subsidiaries
  .getAll()
  .map((e) => Decimal.fromValue(e.producer.ownedCount.value).toNumber());
console.log(`counts realized  ${counts.join(' ')}`);
console.log(`counts projected ${projection.counts.join(' ')}`);
console.log(
  `income realized $${firm.incomeRate.value.toExponential(3)}/s · projected $${projection.finalRate.toExponential(3)}/s`,
);
console.log(`hand-buys before the desk: ${run.handBuys}`);
const earned = (xs: { achievement: { earned: { value: boolean } } }[]) =>
  xs.filter((e) => e.achievement.earned.value).length;
console.log(
  `management bought ${firm.management.purchasedCount.value}/${firm.management.size} · milestones ${earned(firm.milestones.getAll())}/${firm.milestones.size} · grades ${earned(firm.grades.getAll())}/${firm.grades.size}`,
);
console.log(
  run.anomalies.length ? `ANOMALIES: ${run.anomalies.join('; ')}` : 'no NaN, no negative cash',
);
run.dispose();
