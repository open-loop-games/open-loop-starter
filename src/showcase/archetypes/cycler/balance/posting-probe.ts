/**
 * Cycler: posting probe. Plays one watch per posting at knowledge zero over three seeds,
 * once with the keeper taking Brass fittings and once declining it, and prints nights,
 * minutes and entries per minute. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/posting-probe.ts`
 *
 * How to read it:
 * - nights against `cycler-projection.ts` § per posting: the keeper should land within a
 *   night of the saturated prediction.
 * - entries per minute should sit roughly level across postings, so the choice is about
 *   pace, a long gentle watch or a short hard one, and not about reward.
 * - brass is run-local ward the peg does not see; the gap between the two tables is its
 *   weight.
 */

import { POSTINGS } from '../data';
import {
  DECLINES_BRASS,
  TAKES_BRASS,
  buildGame,
  forcePosting,
  playWatch,
  type WatchResult,
} from './_keeper';

const SEEDS = [11, 12, 13];

console.log('\nCYCLER posting probe — one watch each, knowledge at zero');
for (const [label, findPreference] of [
  ['takes brass', TAKES_BRASS],
  ['declines brass', DECLINES_BRASS],
] as const) {
  console.log(`\n${label.toUpperCase()}`);
  for (const post of POSTINGS) {
    const rows: WatchResult[] = [];
    for (const seed of SEEDS) {
      const g = buildGame(seed);
      forcePosting(g, post.id);
      g.watch.startWatch();
      const r = playWatch(g, { findPreference });
      if (r) rows.push(r);
      g.dispose();
    }
    const avg = (f: (r: WatchResult) => number) =>
      rows.reduce((a, r) => a + f(r), 0) / Math.max(1, rows.length);
    const span = (f: (r: WatchResult) => number) =>
      `${Math.min(...rows.map(f))}–${Math.max(...rows.map(f))}`;
    const mins = avg((r) => r.seconds / 60);
    console.log(
      `  ${post.name.padEnd(12)} nights ${avg((r) => r.nights).toFixed(1)} [${span((r) => r.nights)}]  ` +
        `minutes ${mins.toFixed(1)}  entries ${avg((r) => r.entries).toFixed(1)}  ` +
        `entries/min ${(avg((r) => r.entries) / mins).toFixed(2)}`,
    );
  }
}
