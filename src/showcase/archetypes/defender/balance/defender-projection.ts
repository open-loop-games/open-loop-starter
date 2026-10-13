/**
 * Defender — spine projection. Prints what `data/spine.ts` derives: each
 * plot's pressure before and after the almanac, a sample of waves, the plant
 * prices, and the predicted beats with their schedule check. Runs no engine.
 * Prints; never asserts.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/defender/balance/defender-projection.ts`
 *
 * How to read it:
 * - § Plots: pressure before and after the almanac a flawless gardener holds
 *   entering the plot, spent as the reference gardener spends it.
 * - § Wheel: each plot's rotation, the reference board's split across forms,
 *   and the answer share and toll each kind's nights are sized with.
 * - § Waves: committed value, income, the reference board's capacity and the
 *   HP pool it is sized to, at sample waves of each plot.
 * - § Plants: prices solved from the thrush.
 * - § Schedule: each predicted beat against the beat `arc-probe.ts` recorded
 *   (`manifest.ts`), and each plot's own span against the recorded one. A line
 *   marked `off` is outside the plot's tolerance.
 */

import {
  ANCHORS,
  ARMOUR,
  BASE_SEEDLINGS,
  FORMS,
  KIND_TOLL,
  NIGHTS,
  LESSONS,
  LESSON_MAX,
  PLOTS,
  answerShare,
  committedValue,
  effectivePressure,
  entryLevel,
  formShares,
  gardenerLevel,
  nightKind,
  perfectScore,
  plantSpecs,
  predictHeldAt,
  pressure,
  referenceCapacity,
  waveHp,
  waveIncome,
  wavesIn,
} from '../data';
import { manifest } from '../manifest';

const f = (x: number, d = 1) => x.toFixed(d);
const a = ANCHORS;

/** Lesson levels after `notes` notes, spent one at a time on the least-learned, in almanac order. */
function spread(notes: number): Record<string, number> {
  const lv: Record<string, number> = Object.fromEntries(LESSONS.map((l) => [l.id, 0]));
  for (let i = 0; i < notes; i++) {
    const next = LESSONS.map((l) => l.id)
      .filter((id) => lv[id] < LESSON_MAX)
      .sort((x, y) => lv[x] - lv[y])[0];
    if (next) lv[next] += 1;
  }
  return lv;
}

console.log('\nThe Walled Garden — spine projection\n');

console.log('Plots');
let xp = 0;
for (const [p, def] of PLOTS.entries()) {
  const level = gardenerLevel(xp);
  const lv = spread(level);
  console.log(
    `  ${def.displayName.padEnd(18)} ${wavesIn(a, p)} waves  pressure ${f(pressure(a, p), 2)} → ` +
      `${f(effectivePressure(a, p, lv['well-fed'], lv.bins, lv['early-riser']), 2)} at level ${level}`,
  );
  xp += perfectScore(a, p, BASE_SEEDLINGS);
}
console.log(`  flawless clears reach level ${gardenerLevel(xp)} (xp ${xp})`);

console.log('\nWheel');
for (const [p, def] of PLOTS.entries()) {
  const shares = formShares(a, p);
  console.log(
    `  ${def.id.padEnd(12)} level ${entryLevel(a, p)}  nights ${NIGHTS[p].join(' ')}  ` +
      `split ${FORMS.map((fm) => `${fm} ${f(shares[fm], 2)}`).join(', ')}`,
  );
  for (const k of new Set(NIGHTS[p])) {
    console.log(
      `    ${k.padEnd(7)} ${ARMOUR[k].padEnd(6)} answer ${f(answerShare(a, p, k), 2)}  toll ${f(KIND_TOLL[k], 2)}`,
    );
  }
}

console.log('\nWaves');
console.log('  plot          wave kind     value  income  capacity      W');
for (const [p, def] of PLOTS.entries()) {
  for (const w of [1, 5, wavesIn(a, p)]) {
    console.log(
      `  ${def.id.padEnd(12)} ${String(w).padStart(5)} ${nightKind(a, p, w).padEnd(7)}` +
        `${f(committedValue(a, w), 0).padStart(7)} ` +
        `${f(waveIncome(a, w), 0).padStart(7)} ${f(referenceCapacity(a, p, w), 0).padStart(9)} ` +
        `${f(waveHp(a, p, w), 0).padStart(6)}`,
    );
  }
}

console.log('\nPlants');
for (const s of Object.values(plantSpecs(a))) {
  console.log(`  ${s.id.padEnd(9)} cost ${String(s.cost).padStart(4)}   level ${s.unlockLevel}`);
}

console.log("\nSchedule (tolerance ±15% of each plot's own span)");
const predicted = predictHeldAt(a, PLOTS.length);
let previous = 0;
let recordedPrevious = 0;
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
  const recordedSpan = recorded - recordedPrevious;
  recordedPrevious = recorded;
  const mark = Math.abs(recordedSpan - span) <= 0.15 * span ? 'ok' : 'off';
  console.log(
    `  ${label.padEnd(24)}${f(t, 0).padStart(6)}s  recorded ${recorded}s  ` +
      `span ${f(span, 0)}s vs ${recordedSpan}s  ${mark}`,
  );
}
