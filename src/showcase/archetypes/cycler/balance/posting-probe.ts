/**
 * Cycler: posting probe. Plays one watch per posting at knowledge zero over three seeds,
 * under four keepers: bare (no shoring, no Brass fittings), with Brass, with shoring, and
 * the reference keeper with both. Prints nights beside the spine's prediction, then the
 * reference keeper's minutes and entries per minute. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/posting-probe.ts`
 *
 * How to read it:
 * - the bare keeper saturates the struck side and nothing more, so it should match the
 *   spine's nights (`cycler-projection.ts` § per posting).
 * - the brass and shoring columns are the remainder the spine declares and does not
 *   project: ward the storm was not pegged to.
 * - entries per minute should sit roughly level across postings, so the choice is about
 *   pace, a long gentle watch or a short hard one, and not about reward.
 */

import { POSTINGS, deriveSpine, predictNightsSurvived, referenceInput } from '../data';
import {
  DECLINES_BRASS,
  TAKES_BRASS,
  buildGame,
  forcePosting,
  playWatch,
  type KeeperPolicy,
  type WatchResult,
} from './_keeper';

const SEEDS = [11, 12, 13];
const KEEPERS: [string, KeeperPolicy][] = [
  ['bare', { findPreference: DECLINES_BRASS, shores: false }],
  ['+brass', { findPreference: TAKES_BRASS, shores: false }],
  ['+shoring', { findPreference: DECLINES_BRASS, shores: true }],
  ['both', { findPreference: TAKES_BRASS, shores: true }],
];

function play(postingId: (typeof POSTINGS)[number]['id'], policy: KeeperPolicy): WatchResult[] {
  const rows: WatchResult[] = [];
  for (const seed of SEEDS) {
    const g = buildGame(seed);
    forcePosting(g, postingId);
    g.watch.startWatch();
    const r = playWatch(g, policy);
    if (r) rows.push(r);
    g.dispose();
  }
  return rows;
}

const avg = (rows: WatchResult[], f: (r: WatchResult) => number) =>
  rows.reduce((a, r) => a + f(r), 0) / Math.max(1, rows.length);

const spine = deriveSpine(referenceInput());
console.log('\nCYCLER posting probe — one watch each, knowledge at zero, seeds 11–13\n');
console.log(
  `  ${'posting'.padEnd(12)} spine  ${KEEPERS.map(([k]) => k.padStart(10)).join('')}   min  entries/min`,
);
for (const post of POSTINGS) {
  const results = KEEPERS.map(([, policy]) => play(post.id, policy));
  const ref = results[results.length - 1];
  const mins = avg(ref, (r) => r.seconds / 60);
  console.log(
    `  ${post.name.padEnd(12)} ${String(predictNightsSurvived(spine, post.g)).padStart(5)}  ` +
      results
        .map((rows) =>
          avg(rows, (r) => r.nights)
            .toFixed(1)
            .padStart(10),
        )
        .join('') +
      `  ${mins.toFixed(1).padStart(4)}  ${(avg(ref, (r) => r.entries) / mins).toFixed(2).padStart(11)}`,
  );
}
