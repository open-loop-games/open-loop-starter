/**
 * Explorer — spine projection. Prints what `data/spine.ts` derives: each band's
 * reference trip and budget, the prices those budgets set, and the predicted
 * beats. Runs no engine. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/explorer/balance/explorer-projection.ts`
 *
 * How to read it:
 * - § Bands: the reference trip into each band, what it earns per second with
 *   Huntcraft and the bestiary folded in, and the budget a stay banks.
 * - § Prices: each gear line's next level against the band budget it is bought
 *   from. A price above its budget share would stall the walker in that band.
 * - § Beats: the predictions `balance/arc-probe.ts` measures against.
 */

import {
  ANCHORS,
  GEAR,
  HART_TRAIL_KILLS,
  MEADOW_SECONDS,
  DWELL_SECONDS,
  antlerBudget,
  antlerRate,
  bandSeconds,
  bandStart,
  campCost,
  hideBudget,
  hideRate,
  jerkyDemand,
  killsIn,
  meatNetRate,
  packCapacity,
  predictBeats,
  racksFor,
  skillLevelAt,
  supplyCapacity,
  tripSeconds,
  tripSteps,
  tripSupply,
  yieldMult,
} from '../data';

const r2 = (x: number) => +x.toFixed(2);

console.log('\n=== Anchors ===');
console.log(ANCHORS);
console.log({
  meadowSeconds: r2(MEADOW_SECONDS),
  dwellSeconds: r2(DWELL_SECONDS),
  hartTrailKills: HART_TRAIL_KILLS,
});

console.log('\n=== Bands: the reference trip and its budget ===');
console.table(
  [0, 1, 2, 3, 4].map((k) => ({
    band: k,
    start: Math.round(bandStart(k)),
    stay: Math.round(bandSeconds(k)),
    tripSteps: tripSteps(k),
    tripSecs: tripSeconds(k),
    tripJerky: tripSupply(k),
    'jerky/s': r2(jerkyDemand(k)),
    racks: racksFor(k),
    kills: r2(killsIn(k)),
    huntcraft: skillLevelAt(k),
    yieldMult: r2(yieldMult(k)),
    'hides/s': r2(hideRate(k)),
    'antler/s': r2(antlerRate(k)),
    'meatNet/s': r2(meatNetRate(k)),
    hideBudget: Math.round(hideBudget(k)),
    antlerBudget: Math.round(antlerBudget(k)),
    pack: packCapacity(k),
    satchel: supplyCapacity(Math.min(k, 3)),
  })),
);

console.log('\n=== Prices: each gear level, and the camps ===');
console.table(
  GEAR.flatMap((g) =>
    Array.from({ length: g.limit }, (_, l) => ({ gear: g.id, level: l + 1, ...g.cost(l) })),
  ),
);
console.log({ camps: [0, 1, 2, 3].map(campCost) });

console.log('\n=== Beats ===');
console.table(predictBeats());
