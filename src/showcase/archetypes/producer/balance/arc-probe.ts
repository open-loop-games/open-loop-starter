/**
 * Producer: arc probe. Plays the shipping game headless under the reference
 * player and prints the arc against the spine's projection: the beats that shape
 * it, how the time between perceptible beats sits in the flow channels hour by
 * hour, and the end state. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/producer/balance/arc-probe.ts [minutes] [seed] [--beats]`
 *
 * How to read it:
 * - § spine: the derived ratio, the solved cost step and the ending's price.
 * - § landmarks: tier openings, hires and the ending, realized beside projected.
 * - § hours: per hour, the economic beats (everything but tips) and their longest
 *   gap, then the flow channels of the gaps between all perceptible beats, tips
 *   included. Tips carry the minutes after the first hour; the economic beats are
 *   what the arc is made of.
 * - § end state: counts, phones, achievements and income against the projection.
 * - `--beats` lists every economic beat.
 */

import { Decimal, classifyFlowChannel } from '@open-loop/engine';
import {
  CLASS_COST_STEP,
  COST_RATIO,
  DOUBLING_PURCHASES,
  ENDING_COST,
  ENDING_TARGET,
  LADDER,
  projectArc,
} from '../data';
import { fmt, runArc, type Beat } from './_engine';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const HORIZON = Number(args[0] ?? (ENDING_TARGET * 1.1) / 60) * 60;
const SEED = Number(args[1] ?? 1);
const LIST = process.argv.includes('--beats');

const run = await runArc({ seconds: HORIZON, seed: SEED });
const { beats, firm, automation, tips, standing } = run;
const projection = projectArc(LADDER, HORIZON, { endingCost: ENDING_COST });

console.log(`── spine (seed ${SEED}) ──`);
console.log(
  `m ${COST_RATIO.toFixed(4)} (doubles every ${DOUBLING_PURCHASES.toFixed(2)} buys) · cost step ×${CLASS_COST_STEP.toFixed(3)} solved for the ending at ${fmt(ENDING_TARGET)} · ending $${ENDING_COST.toExponential(3)}`,
);

// ── landmarks ──
const at = (key: string) => beats.find((b) => b.key === key)?.t ?? Infinity;
const projected = (label: string) => projection.beats.find((b) => b.label === label)?.t ?? Infinity;
console.log('\n── landmarks (realized · projected) ──');
const rows: [string, number, number][] = [
  ...firm.subsidiaries
    .getAll()
    .map((e): [string, number, number] => [
      `open ${e.def.displayName}`,
      at(`open:${e.def.id}`),
      projection.tierOpen[e.def.tier],
    ]),
  ...automation.dispatch.tiers
    .filter((tier) => tier.order > 0)
    .map((tier): [string, number, number] => [
      `hire ${tier.displayName}`,
      at(`d:${tier.id}`),
      projected(`hire ${tier.id}`),
    ]),
  ['ending offered', at('ending-offered'), projection.endingOffered],
  ['the Consolidated Building', at('ending'), projection.endingBought],
];
for (const [label, t, p] of rows.sort((a, b) => a[1] - b[1])) {
  const drift =
    Number.isFinite(t) && Number.isFinite(p) ? `${(100 * (t / p - 1)).toFixed(1)}%` : '';
  console.log(`${fmt(t).padStart(9)}  ${fmt(p).padStart(9)}  ${drift.padStart(7)}  ${label}`);
}

// ── hours ──
const end = Math.min(HORIZON, at('ending'));
const economic = beats.filter((b) => !b.key.startsWith('tip:') && b.t <= end);
const perceptible = beats.filter((b) => b.t <= end);
const hourOf = (t: number) => Math.floor((t - 1e-9) / 3600);
console.log('\n── hours (economic beats · longest economic gap · channels of all gaps) ──');
for (let h = 0; h * 3600 < end; h++) {
  const inHour = (b: Beat) => hourOf(b.t) === h;
  const econ = economic.filter(inHour);
  let prev = h * 3600;
  let longest = 0;
  for (const b of econ) {
    longest = Math.max(longest, b.t - prev);
    prev = b.t;
  }
  longest = Math.max(longest, Math.min(end, (h + 1) * 3600) - prev);
  const channels = new Map<string, number>();
  let last = perceptible.filter((b) => hourOf(b.t) < h).at(-1)?.t ?? 0;
  for (const b of perceptible.filter(inHour)) {
    const gap = b.t - last;
    channels.set(classifyFlowChannel(gap), (channels.get(classifyFlowChannel(gap)) ?? 0) + gap);
    last = b.t;
  }
  const span = Math.min(end, (h + 1) * 3600) - h * 3600;
  const mix = [...channels].map(([ch, s]) => `${ch} ${((100 * s) / span).toFixed(0)}%`).join(' · ');
  console.log(
    `  hour ${h + 1}: ${String(econ.length).padStart(4)} beats · longest ${fmt(longest).padStart(7)} · ${mix}`,
  );
}

if (LIST) {
  console.log('\n── economic beats ──');
  for (const b of economic) console.log(`${fmt(b.t).padStart(9)}  ${b.label}`);
}

// ── end state ──
console.log('\n── end state ──');
const counts = firm.subsidiaries
  .getAll()
  .map((e) => Decimal.fromValue(e.producer.ownedCount.value).toNumber());
const phones = Decimal.fromValue(automation.phone.count.value).toNumber();
console.log(`counts realized  ${counts.join(' ')} · phones ${phones}`);
console.log(`counts projected ${projection.counts.join(' ')} · phones ${projection.phones}`);
console.log(
  `income realized $${automation.income.value.toExponential(3)}/s · projected $${projection.finalRate.toExponential(3)}/s`,
);
console.log(
  `achievements ${standing.achievements.value} (projected ${projection.achievements}) · standing ${standing.standing.value.toFixed(2)} · tips caught ${tips.caught.value} (projected ${projection.tipsCaught.toFixed(0)})`,
);
console.log(`hand-buys before the desk: ${run.handBuys}`);
console.log(
  run.anomalies.length ? `ANOMALIES: ${run.anomalies.join('; ')}` : 'no NaN, no negative cash',
);
run.dispose();
