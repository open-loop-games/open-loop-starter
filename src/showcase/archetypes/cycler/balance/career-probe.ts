/**
 * Cycler: career probe. Plays watches back to back under the reference keeper, buying
 * knowledge between them, and prints each watch's length, payout and the knowledge held.
 * Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/career-probe.ts [watches] [seed]`
 *
 * How to read it:
 * - nights should hold flat while stone climbs (the peg) and step up at each almanac level.
 * - entries per watch climb slowly: the payout is a cube root of each source.
 */

import { toNumber } from '@open-loop/engine';
import { buildGame, clock, keeperBetweenWatches, playWatch } from './_keeper';

const watches = Number(process.argv[2] ?? 8);
const seed = Number(process.argv[3] ?? 2);
const g = buildGame(seed);
const lv = g.logbook.level;
let total = 0;
console.log(`\nCYCLER career probe — ${watches} watches, seed ${seed}\n`);
for (let i = 1; i <= watches; i++) {
  g.watch.startWatch();
  const r = playWatch(g);
  if (!r) {
    console.log(`  watch ${i}: !! the tower still stands at the time limit`);
    break;
  }
  total += r.seconds;
  console.log(
    `  watch ${String(i).padStart(2)}: ${r.nights} nights in ${(r.seconds / 60).toFixed(1)} min, ` +
      `weathered ${r.weathered.toFixed(0)}, gathered ${r.gathered.toFixed(0)}, +${r.entries} entries` +
      `  | stone ${lv('stone')} tides ${lv('tides')} stores ${lv('stores')} almanac ${lv('almanac')}` +
      ` | logbook ${toNumber(g.logbook.entries.value).toFixed(0)}  | ${clock(total)}`,
  );
  keeperBetweenWatches(g.logbook);
}
g.dispose();
