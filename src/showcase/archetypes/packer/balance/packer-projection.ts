/**
 * The spine on paper: every derived constant, the beat schedule, and the price or gate
 * each beat reads off it. No engine. Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/packer/balance/packer-projection.ts
 *
 * The arc probe (`./arc-probe.ts`) plays the same schedule on the real engine and prints
 * where the board lands against it.
 */

import {
  ARC_GROWTH,
  ARC_S,
  BEACON_GAIN,
  BEAT_TIME,
  BEATS,
  CAPACITOR_COST0,
  COOLANT_GAIN,
  CORE_CELLS,
  FINAL_RATE,
  FULL_CELLS,
  LINK_BOOST,
  OPENING_GROWTH,
  OPENING_RATE,
  OPENING_S,
  OPENING_SPEND,
  PRICE_RATIO,
  PULSE_COST0,
  RAIL_DPS,
  RAIL_STEP,
  RAIL_WORTH,
  REFIT_MULT,
  SECTION_CELLS,
  openCellsAt,
  pieceEntryPrice,
  predictedCumulative,
  predictedIncome,
  refitGate,
  refitPrice,
  sectionPrice,
  unlockGate,
  type BeatId,
} from '../data';

const f = (n: number, d = 2) => n.toFixed(d);
console.log('== strengths ==');
console.log(
  `  price ratio ${f(PRICE_RATIO, 4)} · link boost ${LINK_BOOST} · beacon gain ${BEACON_GAIN} · coolant gain ${COOLANT_GAIN} · rail dps ${f(RAIL_DPS)} · refit ×${REFIT_MULT}`,
);
console.log(
  `  hull: core ${CORE_CELLS} cells, sections ${SECTION_CELLS.join('/')}, full ${FULL_CELLS}`,
);
console.log('== opening ==');
console.log(
  `  pulse ${PULSE_COST0}, capacitor ${CAPACITOR_COST0} · spend ${f(OPENING_SPEND, 0)} · rate 1 → ${OPENING_RATE}/s at λ ${f(OPENING_GROWTH, 4)} · ${f(OPENING_S, 1)} s`,
);
console.log('== main arc ==');
console.log(
  `  ${f(ARC_S, 0)} s → ${f(FINAL_RATE, 0)}/s at λ ${f(ARC_GROWTH, 5)}, rail step ×${f(RAIL_STEP, 1)}`,
);

const what = (b: BeatId): string => {
  if (b.startsWith('section:')) return `price ${f(sectionPrice(b), 0)}`;
  if (b.startsWith('refit:')) return `price ${f(refitPrice(b), 0)}, shown at ${f(refitGate(b), 0)}`;
  const worth = b === 'unlock:rail' ? RAIL_WORTH : 1;
  return `gate ${f(unlockGate(b), 0)}, first copy ${f(pieceEntryPrice(b, worth), 0)}`;
};
console.log('== the schedule ==');
console.log('  beat                  at (s)  income  earned  open  price or gate');
for (const b of BEATS) {
  const t = BEAT_TIME[b];
  console.log(
    `  ${b.padEnd(20)} ${f(t, 0).padStart(7)} ${f(predictedIncome(t), 1).padStart(7)} ${f(predictedCumulative(t), 0).padStart(7)} ${String(openCellsAt(b)).padStart(5)}  ${what(b)}`,
  );
}
