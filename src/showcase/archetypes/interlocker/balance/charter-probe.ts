/**
 * The run model against the game: one run under the foreman for each lifetime renown and
 * charter set, measured beside what the spine plans for it. Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/interlocker/balance/charter-probe.ts
 *
 * About 17 s: 28 cells of four runs at a 2 s tick.
 *
 * Each cell plays four runs from a granted empire and reads the last three, beside the
 * spine's prediction for the empire each opened with, so the Patent Pool has an
 * Exposition to keep its patents across. The row's renown is the second run's. Charters
 * are granted, not bought, so they stay the cell's set.
 *
 * Reading it:
 * - each cell is the mean run length and medal, measured beside planned. A run is worth its
 *   `gainRate`, the growth its medal buys per second; the rms of planned over measured
 *   gain rate is the model's error, and `RAMP_SHARE` and `ORDER_FILL` in
 *   `../data/spine.ts` are fit on it.
 * - § lift is each charter's lift to the gain rate over none, measured and planned. A
 *   charter's own row is what `CHARTER_SHARE` solves Crédit Mobilier and the École against.
 */

import { spreadOf } from '@/balance';
import { formatClock } from '@/composables/useFormatting';
import { CHARTER_IDS, gainRate, planFor, predictRun, type CharterId } from '../data';
import { runArc } from './_foreman';

const RENOWN = [0, 12, 40, 150];
/** Runs read per cell, after the first: orders make one run a noisy sample. */
const SAMPLES = 3;
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

interface Cell {
  renown: number;
  seconds: [number, number];
  medal: [number, number];
  /** gain rate, measured and planned */
  rate: [number, number];
}
const cells: Cell[][] = [];
let se = 0;
let sm = 0;
for (const r of RENOWN) {
  const row = SETS.map((charters) => {
    const arc = runArc({
      expositions: 1 + SAMPLES,
      start: { renown: r, charters },
      maxSimSeconds: 7200,
      dt: 2,
    });
    // Each sampled run against the spine's prediction for the empire it opened with.
    let held = r + arc.expositions[0]!.renown;
    const runs = arc.expositions.slice(1).map((run) => {
      const empire = { renown: held, charters };
      const predicted = predictRun(empire, planFor(empire));
      held += run.renown;
      return {
        seconds: [run.runSeconds, predicted.seconds],
        medal: [run.renown, predicted.renown],
        rate: [
          gainRate(empire, run.renown, run.runSeconds),
          gainRate(empire, predicted.renown, predicted.seconds),
        ],
      };
    });
    const pick = (k: keyof (typeof runs)[number], i: number) => (x: (typeof runs)[number]) =>
      x[k][i]!;
    const mean = spreadOf(runs, {
      seconds: pick('seconds', 0),
      plannedSeconds: pick('seconds', 1),
      medal: pick('medal', 0),
      plannedMedal: pick('medal', 1),
      rate: pick('rate', 0),
      plannedRate: pick('rate', 1),
    });
    const pair = (k: string, planned: string) =>
      [mean[k]?.avg ?? NaN, mean[planned]?.avg ?? NaN] as [number, number];
    const cell: Cell = {
      renown: r + arc.expositions[0]!.renown,
      seconds: pair('seconds', 'plannedSeconds'),
      medal: pair('medal', 'plannedMedal'),
      rate: pair('rate', 'plannedRate'),
    };
    se += (cell.rate[1] / cell.rate[0] - 1) ** 2;
    sm += (cell.medal[1] / cell.medal[0] - 1) ** 2;
    return cell;
  });
  cells.push(row);
}

console.log('== run length and medal, measured/planned ==');
console.log('renown ' + NAMES.map((n) => n.padStart(19)).join(''));
for (const row of cells)
  console.log(
    String(row[0]!.renown).padEnd(7) +
      row
        .map((c) =>
          `${formatClock(c.seconds[0])}+${c.medal[0].toFixed(0)}/${formatClock(c.seconds[1])}+${c.medal[1].toFixed(0)}`.padStart(
            19,
          ),
        )
        .join(''),
  );
const cellsN = RENOWN.length * SETS.length;
console.log(
  `  gain-rate rms ${(Math.sqrt(se / cellsN) * 100).toFixed(1)}%, medal rms ${(Math.sqrt(sm / cellsN) * 100).toFixed(1)}%`,
);

console.log('== lift to the gain rate over none, measured / planned ==');
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
          const m = c.rate[0] / row[0]!.rate[0] - 1;
          const p = c.rate[1] / row[0]!.rate[1] - 1;
          return `${(m * 100).toFixed(0)}%/${(p * 100).toFixed(0)}%`.padStart(12);
        })
        .join(''),
  );
