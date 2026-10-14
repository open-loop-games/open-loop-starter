/**
 * Cycler: career probe. Plays watches back to back under the reference keeper, buying
 * knowledge between them and taking the closing posting once stone has caught up, until the
 * light holds through the final gale. Prints each watch's posting, length, payout and the
 * knowledge held. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/career-probe.ts [watches] [seed]`
 *
 * How to read it:
 * - nights should hold flat while stone climbs (the peg) and step up at each almanac level.
 * - entries per watch climb slowly: the payout is a cube root of each source.
 * - the end beat is the first watch on the Flannans whose light holds; its clock is the arc.
 */

import { toNumber } from '@open-loop/engine';
import { buildGame, clock, keeperBetweenWatches, playWatch } from './_keeper';

const watches = Number(process.argv[2] ?? 14);
const seed = Number(process.argv[3] ?? 2);
const g = buildGame(seed);
const lv = g.logbook.level;
let total = 0;
console.log(`\nCYCLER career probe — up to ${watches} watches, seed ${seed}\n`);
for (let i = 1; i <= watches; i++) {
  g.watch.startWatch();
  const r = playWatch(g);
  if (!r) {
    console.log(`  watch ${i}: !! the tower still stands at the time limit`);
    break;
  }
  total += r.seconds;
  const relief = r.relief ? ` RELIEF ${r.relief.toUpperCase()}` : '';
  console.log(
    `  watch ${String(i).padStart(2)} ${r.posting.padEnd(8)} ${r.nights} nights, ${(r.seconds / 60).toFixed(1)} min, ` +
      `+${r.entries} entries, rows ${r.rows} caught ${r.caught}` +
      `  | stone ${lv('stone')} tides ${lv('tides')} stores ${lv('stores')} almanac ${lv('almanac')}` +
      ` | logbook ${toNumber(g.logbook.entries.value).toFixed(0)} | ${clock(total)}${relief}`,
  );
  if (r.relief === 'held') break;
  keeperBetweenWatches(g.logbook);
}
console.log(`\n  ending: ${g.logbook.ending.value}`);
g.dispose();
