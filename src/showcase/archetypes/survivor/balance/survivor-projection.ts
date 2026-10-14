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
 * - ratings: the model career, rating by rating: the takes before it opens, the agency it
 *   holds, the depth solved from it, and the clearance, which matches G's by construction.
 *   `career-probe.ts` measures the same arc.
 * - clout: the payout model behind the agency's prices, and what the whole shop costs.
 */

import {
  AGENCY,
  AGENCY_GROWTH,
  ANCHORS,
  BEATS,
  CAREER,
  DPS0,
  INCOME_LAG,
  LADDER,
  LEVEL_GAIN,
  OFFENSIVE_PICKS,
  RATINGS,
  RATING_DEPTH,
  REELS_PER_CLOUT,
  STARS,
  clearance,
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

console.log(
  `\nRatings: each depth solved so the take clears its floor as G does with nothing bought, with`,
);
console.log(
  `the damage the agency adds when the rating opens (${ANCHORS.takesPerRating} full takes a rating, the reference agent)`,
);
console.log('  rating  after  depth   damage  clearance  a take pays  agency');
CAREER.forEach((step, r) => {
  const levels = Object.entries(step.agency)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${id} ${n}`)
    .join(', ');
  console.log(
    `  ${RATINGS[r]!.label.padEnd(7)} ${String(step.takesBefore).padStart(5)}  ${f(RATING_DEPTH[r]!, 2).padStart(5)}  ` +
      `×${f(step.damage, 2)}   ${f(clearance(RATING_DEPTH[r]!, step.damage), 3).padStart(6)}     ` +
      `${f(step.payPerTake, 0).padStart(5)}        ${levels || '—'}`,
  );
});

let shop = 0;
for (const a of AGENCY)
  for (let l = 0; l < a.maxLevel; l++) shop += Math.floor(a.baseCost * AGENCY_GROWTH ** l);
const stars = STARS.reduce((x, s) => x + s.cost, 0);
console.log(
  `\nClout: ${f(REELS_PER_CLOUT, 2)} reels a point, so a full take at G pays ${ANCHORS.cloutPerTake}; agency levels grow ×${f(AGENCY_GROWTH, 3)}`,
);
console.log(
  `  the whole shop: ${f(shop, 0)} agency + ${stars} stars = ${f((shop + stars) / ANCHORS.cloutPerTake, 1)} full takes at G`,
);
