/**
 * Cycler: watch probe. Plays one watch at Haven Point under the reference keeper
 * (`./_keeper.ts`) and prints each beat. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/watch-probe.ts [seed]`
 *
 * How to read it:
 * - each dusk: tonight's storm against the struck side's ward. The storm passes the ward
 *   near the crossing night (`cycler-projection.ts`); from then on the tower takes water.
 * - each dawn: what the night leaked and what shoring added. Shoring is the keeper spending
 *   the day's salvage against the dark.
 * - the last line: nights kept and the payout's two sources.
 */

import { buildGame, clock, playWatch } from './_keeper';

const seed = Number(process.argv[2] ?? 1);
const g = buildGame(seed);
g.watch.startWatch();
const result = playWatch(g);
console.log(`\nCYCLER watch probe — Haven Point, seed ${seed}\n`);
if (!result) console.log('  !! the tower still stands at the time limit');
else for (const b of result.beats) console.log(`  ${clock(b.at).padStart(6)}  ${b.text}`);
g.dispose();
