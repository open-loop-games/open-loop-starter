/**
 * The run model against the game: one run under the foreman for each lifetime renown and
 * charter set, measured beside what `predictRun` says. Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/interlocker/balance/charter-probe.ts
 *
 * About 8 s: 35 runs at a 1 s tick, which moves a run by about 2% against 0.25 s, 6% at most.
 *
 * Each cell plays two runs from a granted empire and reads the second, so the Patent Pool
 * has an Exposition to keep its patents across. The second run holds the renown asked for
 * plus the first Exposition's. Charters are granted, not bought, so lifetime renown is the
 * row's alone.
 *
 * Reading it:
 * - `measured/predicted` per cell; the rms over the grid is the model's error, and
 *   `RAMP_SHARE` in `../data/spine.ts` is fit on it.
 * - § saving is each charter's share of the run with none, measured and predicted. A
 *   charter's own row is what `CHARTER_SHARE` solves Crédit Mobilier and the École against.
 */

import { CHARTER_IDS, EXPO_THRESHOLD, predictRun, renownFor, type CharterId } from '../data';
import { runArc } from './_foreman';

const RENOWN = [0, 6, 12, 20, 40];
const SETS: CharterId[][] = [
  [],
  ['patronage'],
  ['patents'],
  ['credit'],
  ['ecole'],
  ['patronage', 'patents'],
  [...CHARTER_IDS],
];
const NAMES = ['none', 'patronage', 'pool', 'credit', 'ecole', 'pat+pool', 'all four'];
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

const cells: { renown: number; measured: number; predicted: number }[][] = [];
let se = 0;
for (const r of RENOWN) {
  const row = SETS.map((charters) => {
    const arc = runArc({
      expositions: 2,
      start: { renown: r, charters },
      maxSimSeconds: 3600,
      dt: 1,
    });
    const renown = r + renownFor(EXPO_THRESHOLD);
    const measured = arc.expositions[1]!.runSeconds;
    const predicted = predictRun({ renown, charters }).seconds;
    se += (predicted / measured - 1) ** 2;
    return { renown, measured, predicted };
  });
  cells.push(row);
}

console.log('== run length, measured/predicted ==');
console.log('renown ' + NAMES.map((n) => n.padStart(12)).join(''));
for (const row of cells)
  console.log(
    String(row[0]!.renown).padEnd(7) +
      row.map((c) => `${fmt(c.measured)}/${fmt(c.predicted)}`.padStart(12)).join(''),
  );
console.log(`  rms ${(Math.sqrt(se / (RENOWN.length * SETS.length)) * 100).toFixed(1)}%`);

console.log('== saving over none, measured / predicted ==');
console.log(
  'renown ' +
    NAMES.slice(1)
      .map((n) => n.padStart(12))
      .join(''),
);
for (const row of cells)
  console.log(
    String(row[0]!.renown).padEnd(7) +
      row
        .slice(1)
        .map((c) => {
          const m = 1 - c.measured / row[0]!.measured;
          const p = 1 - c.predicted / row[0]!.predicted;
          return `${(m * 100).toFixed(0)}%/${(p * 100).toFixed(0)}%`.padStart(12);
        })
        .join(''),
  );
