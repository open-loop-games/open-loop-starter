/**
 * Producer: tip probe. How much tips move the arc, in closed form: the spine's
 * projection with tips drawn on seeded streams instead of booked at their
 * expected value. Runs no engine. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/producer/balance/tip-probe.ts [seeds]`
 *
 * § 1 — the drawn arc. The ending's median and spread over seeds, against the
 *       arc with every tip booked at its expected value, which the solve targets.
 * § 2 — attention. The same at catch rates from idle to attentive: what the
 *       player who catches tips has over the one who does not.
 */

import { createSeededRNG } from '@open-loop/engine';
import { ENDING_COST, ENDING_TARGET, LADDER, projectArc } from '../data';
import { fmt } from './_engine';

const SEEDS = Number(process.argv[2] ?? 24);
const HORIZON = ENDING_TARGET * 2;

function drawn(catchRate: number): number[] {
  const ends: number[] = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    ends.push(
      projectArc(LADDER, HORIZON, {
        catchRate,
        endingCost: ENDING_COST,
        rng: createSeededRNG(seed),
      }).endingBought,
    );
  }
  return ends.sort((a, b) => a - b);
}
const quantile = (xs: number[], q: number) =>
  xs[Math.min(xs.length - 1, Math.floor(q * xs.length))];

console.log(`Producer: tip probe (${SEEDS} seeds)\n`);
console.log('§ 1  The drawn arc');
const expected = projectArc(LADDER, HORIZON, { endingCost: ENDING_COST }).endingBought;
const ends = drawn(1);
const median = quantile(ends, 0.5);
console.log(`  ending, tips at expected value  ${fmt(expected)}`);
console.log(
  `  ending, tips drawn               median ${fmt(median)} · p10 ${fmt(quantile(ends, 0.1))} · p90 ${fmt(quantile(ends, 0.9))}`,
);
console.log(`  drawn over expected ${(median / expected).toFixed(3)}`);

console.log('\n§ 2  Attention');
for (const c of [0, 0.25, 0.5, 0.75, 1]) {
  const e = drawn(c);
  console.log(
    `  catch ${c.toFixed(2)}  median ${fmt(quantile(e, 0.5)).padStart(9)} · p10 ${fmt(quantile(e, 0.1)).padStart(9)} · p90 ${fmt(quantile(e, 0.9)).padStart(9)}`,
  );
}
