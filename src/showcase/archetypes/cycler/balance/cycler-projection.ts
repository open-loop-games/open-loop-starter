/**
 * Cycler: the closed-form projection. The spine (`../data/spine.ts`) in runnable form, pure
 * math with no engine: the derived economy, the nights a saturated keeper survives at each
 * posting, the peg holding under permanent power, and the almanac bending g. It predicts;
 * the probes measure.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/cycler-projection.ts`
 *
 * How to read it:
 * - § the derived economy: every price, the integrity and the opening storm, from the
 *   anchors. Y is one net's catch over a cycle; every price is a fraction of it.
 * - § per posting: a saturated side (five braced walls, three buttresses) against each
 *   posting's g. "survives" is the last whole night the tower stands; the probes' keeper
 *   should land within a night of it.
 * - § the peg: ×power on ward re-pegs W₀, so the nights do not move.
 * - § the almanac: the one lever on the nights.
 */

import {
  ANCHORS,
  KNOWLEDGE_EFFECT,
  POSTINGS,
  bentG,
  crossingNight,
  deriveSpine,
  predictNightsSurvived,
  referenceInput,
} from '../data';

const s = deriveSpine(referenceInput());
const cycle = ANCHORS.daySeconds + ANCHORS.nightSeconds;
const minutes = (nights: number) => ((nights * cycle) / 60).toFixed(1);

console.log('\nCYCLER projection — the spine at knowledge zero\n');
console.log('THE DERIVED ECONOMY');
console.log(
  `  Y ${s.cycleYield}  net cap ${s.netCapacity}  C_max ${s.cMax.toFixed(1)}  ` +
    `H ${s.headroom.toFixed(2)}  W0 ${s.w0.toFixed(2)}  integrity ${s.integrity.toFixed(1)}`,
);
const p = s.prices;
console.log(
  `  prices: net ${p.net.base}×${p.net.growth}^n, breakwater ${p.breakwater.base}×${p.breakwater.growth}^n, ` +
    `buttress ${p.buttress.base}×${p.buttress.growth}^n, winch ${p.winch.base}×${p.winch.growth}^n  ` +
    `start ${s.startSalvage}`,
);
console.log(
  `  payout scales: weathered ${s.payoutScale.weathered.toFixed(2)}  gathered ${s.payoutScale.gathered.toFixed(1)}`,
);

console.log('\nPER POSTING — a saturated keeper');
for (const post of POSTINGS) {
  const n = predictNightsSurvived(s, post.g);
  const weathered = Array.from({ length: n }, (_, i) =>
    Math.min(s.w0 * post.g ** i, s.cMax),
  ).reduce((a, b) => a + b, 0);
  console.log(
    `  ${post.name.padEnd(12)} g ${post.g}  crossing night ${crossingNight(s.headroom, post.g).toFixed(2)}  ` +
      `survives ${n} nights (${minutes(n)} min)  weathered ≈${weathered.toFixed(0)}`,
  );
}

console.log('\nTHE PEG — power on ward re-pegs the storm');
for (const power of [1, KNOWLEDGE_EFFECT.stone ** 2, KNOWLEDGE_EFFECT.stone ** 4]) {
  const sp = deriveSpine(referenceInput(power));
  console.log(
    `  power ×${power.toFixed(2)}  C_max ${sp.cMax.toFixed(0)}  W0 ${sp.w0.toFixed(1)}  ` +
      `survives ${predictNightsSurvived(sp, ANCHORS.gRef)} nights at gRef`,
  );
}

console.log('\nTHE ALMANAC — bending g at the reference posting');
for (let level = 0; level <= 4; level++) {
  const g = bentG(ANCHORS.gRef, level, KNOWLEDGE_EFFECT.almanacBend);
  console.log(
    `  almanac ${level}: g ${g.toFixed(3)} → survives ${predictNightsSurvived(s, g)} nights`,
  );
}
