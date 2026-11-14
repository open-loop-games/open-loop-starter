/**
 * Producer: tip probe. How much tips move the arc, in closed form: the spine's
 * projection with tips drawn on seeded streams instead of booked at their
 * expected value. Runs no engine. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/producer/balance/tip-probe.ts [seeds]`
 * `seeds` is how many seeds of `seedBatch` to draw (default 24).
 *
 * § 1 — the drawn arc. The ending over the seeds, `median [min–max]`, against the
 *       arc with every tip booked at its expected value, which the solve targets.
 * § 2 — attention. The same at catch rates from idle to attentive: what the
 *       player who catches tips has over the one who does not.
 */

import { createSeededRNG } from '@open-loop/engine';
import { formatSpread, seedBatch, spreadOf } from '@/balance';
import { formatClock } from '@/composables/useFormatting';
import { ENDING_COST, ENDING_TARGET, LADDER, projectArc } from '../data';

const SEEDS = seedBatch(Number(process.argv[2] ?? 24));
const HORIZON = ENDING_TARGET * 2;

/** The ending's spread over the seeds, with tips drawn and caught at `catchRate`. */
function drawn(catchRate: number) {
  const ends = SEEDS.map(
    (seed) =>
      projectArc(LADDER, HORIZON, {
        catchRate,
        endingCost: ENDING_COST,
        rng: createSeededRNG(seed),
      }).endingBought,
  );
  return spreadOf(ends, { ending: (t) => t }).ending!;
}

console.log(`Producer: tip probe (${SEEDS.length} seeds)\n`);
console.log('§ 1  The drawn arc');
const expected = projectArc(LADDER, HORIZON, { endingCost: ENDING_COST }).endingBought;
const ends = drawn(1);
console.log(`  ending, tips at expected value  ${formatClock(expected)}`);
console.log(`  ending, tips drawn              ${formatSpread(ends, formatClock)}`);
console.log(`  drawn over expected ${(ends.median / expected).toFixed(3)}`);

console.log('\n§ 2  Attention');
for (const c of [0, 0.25, 0.5, 0.75, 1]) {
  console.log(`  catch ${c.toFixed(2)}  ${formatSpread(drawn(c), formatClock)}`);
}
