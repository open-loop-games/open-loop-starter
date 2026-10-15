/**
 * The spine on paper: the derived strengths, the opening, and the stage walk every price
 * and gate is solved from. No engine. Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/packer/balance/packer-projection.ts
 *
 * Reading § the walk, one row a stage:
 * - `rate` is salvage a second entering the stage and once its packing is adopted;
 * - `spend` is what the copies its packing adds cost, `saved` the part savings pay, and
 *   `ramp` the seconds the rest takes out of income;
 * - `beat` is the beat that closes the stage, and its price (a plate or refit, what the
 *   stage saves) or gate (a schematic, lifetime salvage). `RAMP > GAP` marks a stage whose
 *   adoption outlasts its gap, so its beat cannot land on schedule.
 *
 * The arc probe (`./arc-probe.ts`) plays the same walk on the real engine, and the packing
 * probe (`./packing-probe.ts`) measures the packing claims it reads.
 */

import {
  ARC_END_S,
  BEACON_GAIN,
  BEATS,
  COOLANT_GAIN,
  FULL_CELLS,
  LINK_BOOST,
  OPENING_RATE,
  OPENING_S,
  OPENING_SPEND,
  PIECE_COST0,
  PRICE_RATIO,
  RAIL_DPS,
  REFIT_MULT,
  SECTION_CELLS,
  CORE_CELLS,
  WALK,
  refitGate,
  sectionPrice,
  unlockGate,
} from '../data';

const f = (n: number, d = 0) => n.toFixed(d);
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;

console.log('== strengths ==');
console.log(
  `  price ratio ${f(PRICE_RATIO, 4)} · link boost ${LINK_BOOST} · beacon gain ${BEACON_GAIN} · coolant gain ${COOLANT_GAIN} · rail dps ${f(RAIL_DPS, 2)} · refit ×${REFIT_MULT}`,
);
console.log(
  `  hull: core ${CORE_CELLS} cells, sections ${SECTION_CELLS.join('/')}, full ${FULL_CELLS}`,
);
console.log(
  `  first copies: ${Object.entries(PIECE_COST0)
    .map(([k, v]) => `${k} ${f(v)}`)
    .join(', ')}`,
);
console.log('== opening ==');
console.log(`  spend ${f(OPENING_SPEND)} · rate 1 → ${OPENING_RATE}/s · ${f(OPENING_S, 1)} s`);

console.log('== the walk ==');
console.log(
  '   # after               cells  from    to   rate in → out   spend  saved  ramp  beat                 price or gate',
);
for (const [j, w] of WALK.entries()) {
  const beat = BEATS[j];
  const what = !beat
    ? `arc end ${clock(w.to)}`
    : beat.startsWith('unlock:')
      ? `gate ${f(unlockGate(beat))}`
      : beat.startsWith('refit:')
        ? `price ${f(sectionPrice(beat))}, shown at ${f(refitGate(beat))}`
        : `price ${f(sectionPrice(beat))}`;
  const warn = beat && w.adoption > w.to - w.from ? '  RAMP > GAP' : '';
  console.log(
    `  ${String(j).padStart(2)} ${w.stage.after.padEnd(20)} ${String(w.stage.cells).padStart(4)} ${f(w.from).padStart(5)} ${f(w.to).padStart(5)} ${f(w.rateIn, 1).padStart(7)} → ${f(w.rate, 1).padStart(6)} ${f(w.spend).padStart(7)} ${f(w.fromSavings).padStart(6)} ${f(w.adoption).padStart(5)}  ${(beat ?? '-').padEnd(20)} ${what}${warn}`,
  );
}
console.log(`== landmark: the hull fully fitted at ${clock(ARC_END_S)} (${f(ARC_END_S)} s) ==`);
