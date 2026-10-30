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
 * - § The dark: how fast HP outgrows bounty past a plot's last night.
 * - § Plants: prices solved from the thrush.
 * - § Schedule: the sim-second each plot is predicted held, and its own span.
 *   `arc-probe.ts` checks them against the shipping game.
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

console.log('\nThe dark');
console.log(
  `  past each plot's last night bounty grows ×${f(a.waveGrowth, 2)} a night and HP ` +
    `×${f(a.waveGrowth * a.tailDivergence, 2)}: divergence ${f(a.tailDivergence, 2)}, ` +
    `${f(Math.log(2) / Math.log(a.tailDivergence), 1)} nights to halve the margin`,
);

console.log('\nPlants');
for (const s of Object.values(plantSpecs(a))) {
  console.log(`  ${s.id.padEnd(9)} cost ${String(s.cost).padStart(4)}   level ${s.unlockLevel}`);
}

console.log('\nSchedule');
const predicted = predictHeldAt(a, PLOTS.length);
let previous = 0;
for (const [p, def] of PLOTS.entries()) {
  const t = predicted[p] ?? NaN;
  console.log(
    `  ${`${def.displayName} held`.padEnd(24)}${f(t, 0).padStart(6)}s  span ${f(t - previous, 0)}s`,
  );
  previous = t;
}
