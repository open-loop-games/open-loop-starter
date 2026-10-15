/**
 * The spine on paper: the derived strengths, the opening, and the stage walk every price,
 * gate and carrier hull is solved from. No engine. Prints; never asserts.
 *
 *   pnpm exec vite-node src/showcase/archetypes/packer/balance/packer-projection.ts
 *
 * Reading § the walk, one row a stage, keyed by the event that opened it:
 * - `cells` is the plated hull, and the conditions are the sector's while it holds;
 * - `rate` is salvage a second entering the stage and once its packing is adopted, refits
 *   and honours included;
 * - `spend` is what the copies its packings add cost, `saved` the part savings pay (a
 *   commissioning grant included), and `ramp` the seconds the rest takes out of income;
 * - `closes on` is the event that ends the stage, and its price (a plate or refit, what the
 *   stage saves), gate (a schematic, the ship's salvage) or hull (a carrier). `RAMP > GAP`
 *   marks a stage whose adoption outlasts its gap, so its beat cannot land on schedule.
 *
 * § landmarks checks each commission and the Dreadnought's fall against the arc's target.
 * The arc probe (`./arc-probe.ts`) plays the same walk on the real engine, and the packing
 * probe (`./packing-probe.ts`) measures the packing claims it reads.
 */

import {
  ARC_END_S,
  BEACON_GAIN,
  BEAT_TIME,
  CALIBRATION_FIRST_S,
  CARRIER_FORGIVENESS,
  CARRIER_WINDOW_S,
  COMMISSION_PURSE,
  COOLANT_GAIN,
  DIRECTOR_REACH,
  HONOUR_MULT,
  LANCE_DPS,
  LINK_BOOST,
  OPENING_RATE,
  OPENING_S,
  OPENING_SPEND,
  PIECE_COST0,
  PRICE_RATIO,
  RAIL_DPS,
  REFIT_MULT,
  SHIPS,
  WALK,
  calibrationCost0,
  carrierHull,
  cellsWith,
  refitGate,
  refitPrice,
  sectionPrice,
  unlockGate,
} from '../data';

/** The story's target length: the Dreadnought falls between two and three hours in. */
const ARC_TARGET_S: readonly [number, number] = [2 * 3600, 3 * 3600];

const f = (n: number, d = 0) => n.toFixed(d);
const e = (n: number) => n.toExponential(2);
const clock = (t: number) => {
  const s = Math.round(t);
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

console.log('== strengths ==');
console.log(
  `  price ratio ${f(PRICE_RATIO, 4)} · link boost ${LINK_BOOST} · beacon gain ${BEACON_GAIN} · coolant gain ${COOLANT_GAIN} · director reach ${DIRECTOR_REACH}`,
);
console.log(
  `  rail dps ${f(RAIL_DPS, 2)} · lance dps ${f(LANCE_DPS, 2)} · refit ×${REFIT_MULT} · honour ×${HONOUR_MULT}`,
);
console.log(
  `  carriers: hull = ${CARRIER_FORGIVENESS} × ${CARRIER_WINDOW_S} s of the stage's combat fire`,
);
console.log(
  `  first copies: ${Object.entries(PIECE_COST0)
    .map(([k, v]) => `${k} ${e(v)}`)
    .join(', ')}`,
);
for (const s of SHIPS)
  console.log(
    `  ${s.name}: ${cellsWith(s.id, 0)} → ${cellsWith(s.id, s.sections.length)} cells · purse ${e(COMMISSION_PURSE[s.id])} · first calibration ${e(calibrationCost0(s.id))} (${CALIBRATION_FIRST_S} s of its first fight)`,
  );
console.log('== opening ==');
console.log(`  spend ${f(OPENING_SPEND)} · rate 1 → ${OPENING_RATE}/s · ${f(OPENING_S, 1)} s`);

console.log('== the walk ==');
console.log(
  '  opened by                    cells conditions               from       to     rate in → out      spend    saved  ramp  closes on                    price, gate or hull',
);
for (const [j, w] of WALK.entries()) {
  const next = WALK[j + 1];
  const closes =
    w.stage.fights ?? (next && next.stage.ship === w.stage.ship ? next.stage.key : undefined);
  const what = !closes
    ? next
      ? 'recommission'
      : 'the story ends'
    : closes.startsWith('carrier:')
      ? `hull ${e(carrierHull(closes))}`
      : closes.includes(':unlock:')
        ? `gate ${e(unlockGate(closes))}`
        : closes.includes(':refit:')
          ? `price ${e(refitPrice(closes))}, shown at ${e(refitGate(closes))}`
          : `price ${e(sectionPrice(closes))}`;
  const warn = closes && w.adoption > w.to - w.from ? '  RAMP > GAP' : '';
  console.log(
    `  ${w.stage.key.padEnd(28)} ${String(cellsWith(w.stage.ship, w.stage.sections)).padStart(5)} ${(w.stage.conditions.join('+') || 'calm').padEnd(22)} ${clock(w.from).padStart(8)} ${clock(w.to).padStart(8)} ${e(w.rateIn)} → ${e(w.rate)} ${e(w.spend)} ${e(w.fromSavings)} ${f(w.adoption).padStart(5)}  ${(closes ?? '-').padEnd(28)} ${what}${warn}`,
  );
}

console.log('== landmarks ==');
for (const s of SHIPS) {
  const first = WALK.find((w) => w.stage.ship === s.id)!;
  const acts = s.acts.map((a) => {
    const last = a.beats[a.beats.length - 1]!;
    return `${a.name} ends ${clock(BEAT_TIME[last]!)}`;
  });
  console.log(`  ${s.name} commissioned ${clock(first.from)} · ${acts.join(' · ')}`);
}
const [lo, hi] = ARC_TARGET_S;
console.log(
  `  the Dreadnought falls ${clock(ARC_END_S)} — target ${clock(lo)}–${clock(hi)}: ${ARC_END_S >= lo && ARC_END_S <= hi ? 'on schedule' : 'OFF SCHEDULE'}`,
);
