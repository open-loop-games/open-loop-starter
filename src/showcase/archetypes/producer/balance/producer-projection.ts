/**
 * Producer: spine projection. Prints what `data/spine.ts` derives: the cost ratio,
 * the solved ladder, the stack's prices, the projected beats and the offline
 * window. Runs no engine. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/producer/balance/producer-projection.ts [minutes]`
 *
 * How to read it:
 * - § Ladder: each tier's opener price, base rate, self-payback and projected opening.
 * - § Stack: memo, training, grade and hire prices.
 * - § Beats: the projection's beat list at the horizon; `arc-probe.ts` prints the
 *   engine's beside it.
 * - § Offline: the window and which limit binds.
 */

import {
  ACTIVE_DEAL_RATE,
  BOOKKEEPER,
  CLASS_COST_STEP,
  COST_RATIO,
  DOUBLING_PURCHASES,
  GRADES,
  HIRES,
  LADDER,
  LADDER_TARGET,
  OFFLINE_REPLAY_COST,
  OFFLINE_WAIT_BUDGET,
  OFFLINE_WINDOW_SECONDS,
  SUBSIDIARY_DEFS,
  TRAINING_COUNT,
  UPGRADE_AT,
  gradeThreshold,
  hireCost,
  projectArc,
  trainingCost,
  upgradeCost,
} from '../data';
import { fmt } from './_engine';

const HORIZON = Number(process.argv[2] ?? 30) * 60;
const money = (x: number) => `$${x.toExponential(2)}`;
const projection = projectArc(LADDER, HORIZON);

console.log('\nConsolidated Holdings: spine projection\n');
console.log(
  `m ${COST_RATIO.toFixed(4)} (doubles every ${DOUBLING_PURCHASES.toFixed(2)} buys) · cost step ×${CLASS_COST_STEP.toFixed(3)} · rate step ×${LADDER.rateStep.toFixed(3)} · top tier targeted at ${fmt(LADDER_TARGET)}`,
);

console.log('\nLadder');
for (const [i, def] of SUBSIDIARY_DEFS.entries()) {
  const a = LADDER.baseCost[i];
  const r = LADDER.baseRate[i];
  console.log(
    `  t${i} ${def.displayName.padEnd(15)} a ${money(a).padStart(10)}  r ${money(r).padStart(10)}/s  payback ${(a / r).toFixed(0).padStart(4)}s  opens ${fmt(projection.tierOpen[i]).padStart(7)}`,
  );
}

console.log('\nStack');
console.log(
  `  training  ${Array.from({ length: TRAINING_COUNT }, (_, k) => money(trainingCost(k))).join('  ')}  (hand at ${ACTIVE_DEAL_RATE}/s)`,
);
for (const n of UPGRADE_AT) {
  console.log(
    `  memo @${String(n).padEnd(3)} ${LADDER.baseCost.map((a) => money(upgradeCost(a, n))).join(' ')}`,
  );
}
console.log(
  `  grades    ${GRADES.map((g, k) => `${g} ${money(gradeThreshold(LADDER, k))}`).join('  ')}`,
);
console.log(
  `  hires     ${HIRES.map((h) => `${h.id} ${money(hireCost(LADDER, h.priceTier))}`).join('  ')}`,
);
console.log(`  bookkeeper ${money(hireCost(LADDER, BOOKKEEPER.priceTier))}`);

console.log(`\nBeats (projected, ${fmt(HORIZON)})`);
for (const b of projection.beats) console.log(`  ${fmt(b.t).padStart(7)}  ${b.label}`);
console.log(
  `  end: counts ${projection.counts.join(' ')} · income ${money(projection.finalRate)}/s`,
);

const waitLimit = OFFLINE_WAIT_BUDGET / OFFLINE_REPLAY_COST;
console.log('\nOffline');
console.log(
  `  window ${fmt(OFFLINE_WINDOW_SECONDS)}: game length ${fmt(LADDER_TARGET)}, wait ${OFFLINE_WAIT_BUDGET}s / ${(OFFLINE_REPLAY_COST * 1000).toFixed(2)} ms per second = ${fmt(waitLimit)} · ${waitLimit < LADDER_TARGET ? 'the wait binds' : 'game length binds'}`,
);
