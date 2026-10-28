/**
 * Scripter: arc probe. Plays the shipping game headless under the reference sensei
 * (`./_sensei.ts`) and prints each beat beside the walk's (`../data/spine.ts` `WALK`).
 * Prints; never asserts. Bouts are seeded from the save, so one run is the measurement.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/scripter/balance/arc-probe.ts [seconds] [--beats]`
 *
 * How to read it:
 * - § beats, with `--beats`: every beat in order.
 * - § the gate: each challenger's arrival and first win, walk against engine. An arrival
 *   is gated on all-time Ki, so a late one means the economy runs behind the walk; a late
 *   first win after an on-time arrival means the answer took long to afford or to land.
 * - § graduations: when each came and what it paid.
 * - § bouts: per challenger, bouts fought, won, and median beats against `PAR`.
 * - § end state: the final dojo.
 */

import { CHALLENGERS, PAR, WALK, type ChallengerId } from '../data';
import { num, runArc } from './_engine';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const SECONDS = Number(args[0] ?? 9000);
const LIST = process.argv.includes('--beats');
const clock = (s: number | undefined) =>
  s === undefined
    ? '—'
    : `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmt = (x: number) => (Math.abs(x) >= 1e4 ? x.toExponential(2) : x.toFixed(x < 10 ? 2 : 0));

const started = Date.now();
const arc = runArc(SECONDS);
const { lineage, dojo, kata, graduation } = arc;
console.log(
  `\nSCRIPTER probe — ${SECONDS}s sim, ${((Date.now() - started) / 1000).toFixed(0)}s wall\n`,
);
if (LIST) {
  console.log('BEATS');
  for (const b of arc.beats) console.log(`  ${clock(b.at).padStart(8)}  ${b.text}`);
}

console.log('\nTHE GATE — walk | engine');
console.log('  challenger      arrives (walk)  arrives   first win (walk)  first win');
for (const c of CHALLENGERS) {
  const id = c.id as ChallengerId;
  const walkArrive = WALK.events.find((e) => e.text === `${id} arrives`)?.at;
  console.log(
    `  ${id.padEnd(14)}  ${clock(walkArrive).padStart(8)}        ${clock(arc.arrivals[id]).padStart(8)}  ${clock(WALK.firstWins[id]).padStart(8)}          ${clock(arc.firstWins[id]).padStart(8)}`,
  );
}

console.log('\nGRADUATIONS — walk | engine');
const n = Math.max(WALK.graduations.length, arc.graduations.length);
for (let i = 0; i < n; i++) {
  const w = WALK.graduations[i];
  const e = arc.graduations[i];
  console.log(
    `  #${String(i + 1).padEnd(3)} ${w ? `${clock(w.at)} +${w.insight}` : '—'.padEnd(10)}`.padEnd(
      24,
    ) + `|  ${e ? `${clock(e.at)} +${e.insight}` : '—'}`,
  );
}

console.log('\nBOUTS — fought, won, median beats of the wins (PAR)');
for (const c of CHALLENGERS) {
  const rows = arc.bouts.filter((b) => b.id === c.id);
  if (!rows.length) continue;
  const wins = rows
    .filter((b) => b.won)
    .map((b) => b.beats)
    .sort((a, b) => a - b);
  console.log(
    `  ${c.id.padEnd(10)} ${String(rows.length).padStart(4)} fought ${String(wins.length).padStart(4)} won  median ${wins.length ? wins[Math.floor(wins.length / 2)] : '—'} (${PAR[c.id]})`,
  );
}

console.log('\nEND STATE');
console.log(
  `  Ki/s ${fmt(num(dojo.kiRate.value))}, a strike ${fmt(num(dojo.strikeValue.value))}, students ${dojo.studentCount.value.toFixed(0)}, senpai ${num(dojo.senpai.count.value)}, Temper ${num(dojo.temper.count.value)}`,
);
console.log(
  `  graduations ${lineage.graduations.value}, Insight ever ${num(lineage.insight.cumulative!.value)}, Dan ×${lineage.danMultiplier.value.toFixed(2)}, standing ×${lineage.standing.value.toFixed(2)}, pending ${graduation.pendingInsight.value}`,
);
console.log(
  `  executor ${kata.tier.value}, ${kata.lineCap.value} moves, beats ${lineage.beats.value}, fumbles ${lineage.fumbles.value}, scrolls inked ${arc.inks}`,
);
console.log(
  `  scroll:\n${kata.inked.value
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n')}`,
);
console.log(
  arc.anomalies.length
    ? `\nANOMALIES\n  ${arc.anomalies.slice(0, 20).join('\n  ')}`
    : '\nANOMALIES none',
);
arc.dispose();
