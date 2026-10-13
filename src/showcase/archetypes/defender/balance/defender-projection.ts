/**
 * Defender — spine projection. Prints what `data/spine.ts` derives: each
 * plot's pressure and waves, a sample of wave sizes, the plant prices, the
 * gardener's level after flawless clears, and the predicted beats with their
 * schedule check. Runs no engine. Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/defender/balance/defender-projection.ts`
 *
 * How to read it:
 * - § Plots: pressure before and after the almanac a flawless gardener holds
 *   by then, and the waves each plot runs.
 * - § Waves: committed value, income, window and HP pool at sample waves.
 * - § Plants: prices solved from the thrush.
 * - § Schedule: each predicted beat against the beat `arc-probe.ts` recorded
 *   (`manifest.ts`). A line marked `off` is outside the plot's tolerance.
 */

import {
  ANCHORS,
  BASE_SEEDLINGS,
  LESSON_MAX,
  PLOTS,
  committedValue,
  effectivePressure,
  gardenerLevel,
  perfectScore,
  plantSpecs,
  predictHeldAt,
  pressure,
  waveHp,
  waveIncome,
  waveWindow,
  wavesIn,
} from '../data';
import { manifest } from '../manifest';

const f = (x: number, d = 1) => x.toFixed(d);
const a = ANCHORS;

console.log('\nThe Walled Garden — spine projection\n');

console.log('Plots');
let xp = 0;
for (const [p, def] of PLOTS.entries()) {
  // Notes a flawless gardener holds entering this plot, spread evenly as the reference gardener spends them.
  const notes = gardenerLevel(xp);
  const each = Math.min(LESSON_MAX, Math.floor(notes / 5) + (notes % 5 > 0 ? 1 : 0));
  const bins = Math.min(LESSON_MAX, Math.floor(notes / 5) + (notes % 5 > 1 ? 1 : 0));
  console.log(
    `  ${def.displayName.padEnd(18)} ${wavesIn(a, p)} waves  pressure ${f(pressure(a, p), 2)} → ` +
      `${f(effectivePressure(a, p, each, bins), 2)} at level ${notes}`,
  );
  xp += perfectScore(a, p, BASE_SEEDLINGS);
}
console.log(`  flawless clears reach level ${gardenerLevel(xp)} (xp ${xp})`);

console.log('\nWaves (first plot)');
console.log('  wave  value  income  window   W(p0)');
for (const w of [1, 2, 5, 10, 14, 18]) {
  console.log(
    `  ${String(w).padStart(4)} ${f(committedValue(a, w), 0).padStart(6)} ${f(waveIncome(a, w), 0).padStart(7)} ` +
      `${f(waveWindow(a, w)).padStart(7)} ${f(waveHp(a, 0, w), 0).padStart(7)}`,
  );
}

console.log('\nPlants');
for (const s of Object.values(plantSpecs(a))) {
  console.log(`  ${s.id.padEnd(9)} cost ${String(s.cost).padStart(4)}   level ${s.unlockLevel}`);
}

console.log('\nSchedule (tolerance ±15% of the plot)');
const predicted = predictHeldAt(a, PLOTS.length);
let previous = 0;
for (const [p, def] of PLOTS.entries()) {
  const label = `${def.displayName} held`;
  const recorded = manifest.beats.find((b) => b.label === label)?.recordedFireTimeRange?.[0];
  const t = predicted[p] ?? NaN;
  const span = t - previous;
  previous = t;
  if (recorded === undefined) {
    console.log(`  ${label.padEnd(24)}${f(t, 0).padStart(6)}s  (no recorded beat)`);
    continue;
  }
  const mark = Math.abs(recorded - t) <= 0.15 * span ? 'ok' : 'off';
  console.log(`  ${label.padEnd(24)}${f(t, 0).padStart(6)}s  recorded ${recorded}s  ${mark}`);
}
