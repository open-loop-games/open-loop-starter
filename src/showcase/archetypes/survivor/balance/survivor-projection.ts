/**
 * Survivor: the spine as a runnable function. No engine. Prints the numbers
 * `../data/spine.ts` derives from its anchors, for `take-probe.ts` and `career-probe.ts` to
 * measure on the real floor.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/survivor/balance/survivor-projection.ts`
 *
 * How to read it:
 * - the schedule: each rewrite's authored time beside the time the ladder puts it at. The
 *   ladder is fitted at the first and last beat, so the beats between land near, not on.
 * - damage: DPS0, the solved level gain, and the demand at the last beat.
 * - ratings: what each rating's last scene demands of the loadout, against what a
 *   zero-meta loadout reaches and the most the agency adds. A ratio above the agency's
 *   ceiling is a rating no purchase opens.
 * - clout: the payout model behind the agency's prices, and what the whole shop costs.
 */

import {
  AGENCY,
  AGENCY_GROWTH,
  AGENCY_STEP,
  ANCHORS,
  BEATS,
  DPS0,
  INCOME_LAG,
  LADDER,
  LEVEL_GAIN,
  OFFENSIVE_PICKS,
  RATINGS,
  REELS_PER_CLOUT,
  STARS,
  cumulativeIncome,
  loadoutDps,
  predictedBeatTime,
  requiredDps,
  sceneAt,
} from '../data';

const f = (x: number, d = 1) => x.toFixed(d);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

console.log(`\nSURVIVOR projection: a ${clock(ANCHORS.takeSeconds)} take, a scene a minute\n`);

console.log(
  `The schedule: ${BEATS.count} rewrites, gaps ×${f(BEATS.ratio, 3)} from ${ANCHORS.firstBeat}s to ${ANCHORS.lastInterval}s`,
);
console.log(
  `  ladder x0 ${f(LADDER.x0)} reels, ×${f(LADDER.r, 3)} a rung; income trails arrivals by ${f(INCOME_LAG)}s`,
);
console.log('  beat  schedule  ladder  off by');
BEATS.times.forEach((t, i) => {
  const p = predictedBeatTime(i + 1);
  console.log(
    `  ${String(i + 1).padEnd(5)} ${f(t, 0).padStart(6)}s  ${f(p, 0).padStart(5)}s  ${f(p - t, 0).padStart(5)}s`,
  );
});

const lastBeat = BEATS.times[BEATS.count - 1]!;
const loadout = loadoutDps(OFFENSIVE_PICKS, LEVEL_GAIN);
console.log(`\nDamage: DPS0 ${f(DPS0)} a second; level gain ×${f(LEVEL_GAIN, 3)}, solved`);
console.log(
  `  ${OFFENSIVE_PICKS} offensive picks reach ${f(loadout, 2)}× DPS0, meeting the last beat's demand of ${f(requiredDps(sceneAt(lastBeat)))}`,
);

const effects =
  1 + AGENCY_STEP['effects-budget'] * AGENCY.find((a) => a.id === 'effects-budget')!.maxLevel;
console.log(
  `\nRatings: the last beat's demand against the zero-meta loadout (agency adds at most ×${f(effects, 2)})`,
);
console.log('  rating  scenes      demand  ×loadout');
for (const r of RATINGS) {
  const demand = requiredDps(sceneAt(lastBeat, r.index));
  const ratio = demand / (loadout * DPS0);
  console.log(
    `  ${r.label.padEnd(7)} ${f(sceneAt(0, r.index))}–${f(sceneAt(lastBeat, r.index))}`.padEnd(21) +
      `${f(demand).padStart(7)}  ${f(ratio, 2).padStart(6)}${ratio > effects ? '  past the agency' : ''}`,
  );
}

const full = cumulativeIncome(ANCHORS.takeSeconds) / REELS_PER_CLOUT;
let shop = 0;
for (const a of AGENCY)
  for (let l = 0; l < a.maxLevel; l++) shop += a.baseCost * AGENCY_GROWTH ** l;
const stars = STARS.reduce((x, s) => x + s.cost, 0);
console.log(
  `\nClout: ${f(REELS_PER_CLOUT, 2)} reels a point, so a baseline take (${ANCHORS.baselineTakeSeconds}s) pays ${ANCHORS.cloutPerBaselineTake}`,
);
console.log(
  `  a full take at G pays about ${f(full, 0)}; agency levels grow ×${f(AGENCY_GROWTH, 3)}`,
);
console.log(
  `  the whole shop: ${f(shop, 0)} agency + ${stars} stars = ${f((shop + stars) / ANCHORS.cloutPerBaselineTake, 1)} baseline takes, ${f((shop + stars) / full, 1)} full takes`,
);
