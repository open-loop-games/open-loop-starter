/**
 * Explorer — field probe. Plays the shipping game to the Hart once per seed,
 * measures each band's stay, and prints the next step of the `FIELD_FACTOR`
 * solve. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/explorer/balance/field-probe.ts [seeds]`
 *
 * How to read it:
 * - § Stays: each band's scheduled stay against its measured one, the mean
 *   over seeds. The forest's starts at the first camp, which completes the
 *   forest kit; the others at the entry beat.
 * - § Next step: each factor scaled by scheduled over measured stay. Paste it
 *   into `data/spine.ts`, run `arc-probe.ts`, and keep the step that lands the
 *   Hart: the forest's and the Fen's factors trade, so a full step overshoots.
 */

import { FIELD_FACTOR, bandSeconds, bandStart } from '../data';
import { runArc } from './_engine';

const argv = (globalThis as { process?: { argv: string[] } }).process?.argv ?? [];
const SEEDS = (argv[2] ?? '7,11,23').split(',').map(Number);

/** The beat that opens band k's stay in the spine's bookkeeping, and the one that closes it. */
const OPENS = ['', 'camp 1', 'enter band 2', 'enter band 3', 'enter band 4', 'the Hart'];

const entries: number[][] = OPENS.map(() => []);
for (const seed of SEEDS) {
  const r = await runArc(seed);
  OPENS.forEach((label, i) => {
    const at = r.beats.find((b) => b.label === label)?.at;
    if (at !== undefined) entries[i].push(at);
  });
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

console.log('\n=== Stays: scheduled vs measured, mean over seeds ===');
const rows = [1, 2, 3, 4].map((k) => {
  const measured = mean(entries[k + 1]) - mean(entries[k]);
  return {
    band: k,
    start: Math.round(bandStart(k)),
    measuredStart: Math.round(mean(entries[k])),
    scheduled: Math.round(bandSeconds(k)),
    measured: Math.round(measured),
    factor: FIELD_FACTOR[k],
    next: +((FIELD_FACTOR[k] * bandSeconds(k)) / measured).toFixed(2),
  };
});
console.table(rows);

console.log('\n=== Next step ===');
console.log(`export const FIELD_FACTOR = [1, ${rows.map((r) => r.next).join(', ')}];`);
