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
 * - § per posting: a saturated side (five walls on its own cells, three buttresses) against
 *   each posting's g. "survives" is the last whole night the tower stands; the bare keeper
 *   in `posting-probe.ts` should land on it.
 * - § the peg: ×power on ward re-pegs W₀, so the nights do not move.
 * - § the almanac: the one lever on the nights.
 * - § the spray hedge: the largest storm a side turns at each spray share, by how the three
 *   yard cells behind it split between buttresses and screens. Dawn names spray but not its
 *   share, so the hedge is the column best across the row.
 * - § the finale: the final gale against a saturated side and a whole tower, by stone. The
 *   stone where it first holds is the closing posting's target; the keeper's shoring,
 *   screens and the backing side move the measured hold rate around it.
 */

import {
  ANCHORS,
  KNOWLEDGE_EFFECT,
  POSTINGS,
  SEA,
  SIDE_PROFILE,
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

// ─── The spray hedge ───
// A side's walls with b buttresses behind and 3 − b screens: the largest storm it turns
// whole at each spray share. Yard cells behind a side reach shore cells 0–2, 1–3 and 2–4;
// the middle one is placed first.
const YARD_REACH = [
  [1, 2, 3],
  [0, 1, 2],
  [2, 3, 4],
];
function wallsWith(buttresses: number): number {
  const cover = [0, 0, 0, 0, 0];
  for (const reach of YARD_REACH.slice(0, buttresses)) for (const i of reach) cover[i]++;
  return SIDE_PROFILE.reduce(
    (sum, cell, i) =>
      sum +
      ANCHORS.wardPerWall * (1 + ANCHORS.brace * cell.braced) * (1 + ANCHORS.buttress * cover[i]),
    0,
  );
}
console.log('\nTHE SPRAY HEDGE — largest storm a side turns whole, by buttresses : screens');
console.log(
  `  share   ${[3, 2, 1, 0].map((b) => `${b}:${3 - b}`.padStart(7)).join('')}   (C_max ${s.cMax.toFixed(0)})`,
);
for (const share of [0, ...SEA.sprayShares]) {
  const row = [3, 2, 1, 0].map((b) => {
    const walls = wallsWith(b) / (1 - share);
    const screens = share > 0 ? ((3 - b) * ANCHORS.wardPerWall * ANCHORS.screen) / share : Infinity;
    return Math.min(walls, screens).toFixed(0).padStart(7);
  });
  console.log(`  ${String(Math.round(share * 100)).padStart(3)}%   ${row.join('')}`);
}

// ─── The finale ───
// On the closing posting the storm is authored at `closingStone`, and the final gale is
// `finalGale` × the crossing night's storm, C_max at that stone. A saturated side and a
// whole tower hold it when the gale less the ward fits in the integrity: no shoring, no
// spray, no backing.
console.log(
  `\nTHE FINALE — final gale ${ANCHORS.finalGale} × C_max at stone ${ANCHORS.closingStone}, called by the crossing night`,
);
const finalGale = ANCHORS.finalGale * s.closingW0 * s.headroom;
for (let stone = 0; stone <= 5; stone++) {
  const sp = deriveSpine(referenceInput(KNOWLEDGE_EFFECT.stone ** stone));
  const margin = sp.cMax + sp.integrity - finalGale;
  console.log(
    `  stone ${stone}: gale ${finalGale.toFixed(0)} against ward ${sp.cMax.toFixed(0)} + tower ${sp.integrity.toFixed(0)}` +
      ` → ${margin >= 0 ? `holds, ${margin.toFixed(0)} to spare` : `${(-margin).toFixed(0)} short`}`,
  );
}
