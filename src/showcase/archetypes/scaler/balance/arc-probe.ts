/**
 * Scaler: arc probe. Plays the shipping game headless under the reference
 * player and prints each beat beside the spine's prediction. Prints; never
 * asserts. The game has no RNG, so one run is the measurement.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/scaler/balance/arc-probe.ts [seconds] [--beats]`
 *
 * How to read it:
 * - § beats, with `--beats`: every scanner line, in order.
 * - § tier openings: the first timeline's openings against the ladder model,
 *   with the units held of the tier below; `hold` is fitted to this column.
 * - § layers: the first Rewrite and every Age, spine against engine: when, how
 *   long the layer's cycle ran, and what it paid.
 * - § cadence: per 15-minute window, Reboots and Rewrites and their median
 *   length. Once automated, a layer's pace is its interval and share, so these
 *   columns are where engine and spine part ways first.
 * - § Elseworlds: every scheduled tier, when the spine and the engine entered and
 *   resolved it, against the goal the spine sized.
 * - § end state: the final stack.
 */

import { ANCHORS, PREDICTION, REWRITE_THRESHOLD, TIERS, ageGate } from '../data';
import { num, runArc, DT } from './_engine';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const SECONDS = Number(args[0] ?? 15000);
const LIST = process.argv.includes('--beats');
const fmt = (x: number) => (Math.abs(x) >= 1e4 ? x.toExponential(2) : x.toFixed(x < 10 ? 2 : 0));
const clock = (s: number | undefined) =>
  s === undefined
    ? '—'
    : `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const median = (xs: number[]) =>
  xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN;

const started = Date.now();
const arc = runArc(SECONDS);
const { core, run, legacy, continuity, canon, prestige, legends, automation } = arc;
const walk = PREDICTION.walk;

console.log(
  `\nSCALER probe — ${SECONDS}s sim at dt=${DT}s, one deterministic run (no RNG in the game), ${((Date.now() - started) / 1000).toFixed(0)}s wall\n`,
);
if (LIST) {
  console.log('BEATS');
  for (const b of arc.beats) console.log(`  ${clock(b.at).padStart(8)}  ${b.text}`);
}

console.log('\nTIER OPENINGS, first run — spine vs probe (seconds into the run)');
TIERS.forEach((tier, i) => {
  const pred = PREDICTION.tierOpens[i];
  const got = arc.firstRunOpens[i];
  console.log(
    `  ${tier.displayName.padEnd(16)} spine ${fmt(pred).padStart(6)}  probe ${got === undefined ? '   —' : fmt(got).padStart(6)}` +
      `  ratio ${got === undefined || i === 0 ? '—' : (got / pred).toFixed(2)}` +
      (arc.heldAtOpen[i] === undefined
        ? ''
        : `  |  held when next opened: ${arc.heldAtOpen[i]} (spine ${ANCHORS.hold})`),
  );
});

console.log(`\nLAYERS — spine vs probe (Rewrite threshold ${fmt(REWRITE_THRESHOLD)} Legacy)`);
const r1 = walk.rewrites[0];
const p1 = arc.rewrites[0];
console.log(
  `  first Rewrite   spine ${clock(r1?.at).padStart(8)}  probe ${clock(p1?.at).padStart(8)}`,
);
walk.ages.forEach((a, i) => {
  const p = arc.ages[i];
  console.log(
    `  Age ${a.age} (gate ${fmt(ageGate(i))} C)  spine ${clock(a.at).padStart(8)} after ${clock(a.ageSeconds)} +${a.canon}` +
      `  |  probe ${p ? `${clock(p.at).padStart(8)} after ${clock(p.age)} +${p.gain}` : '—'}`,
  );
});

console.log('\nCADENCE per 15 min — spine | probe');
console.log(
  '  window  reboots  med run  rewrites  med cycle  |  reboots  med run  rewrites  med cycle',
);
for (let w = 0; w * 900 < SECONDS; w++) {
  const inW = (at: number) => at >= w * 900 && at < (w + 1) * 900;
  const sRuns = walk.steps.filter((s) => inW(s.at)).map((s) => s.runSeconds);
  const sCycles = walk.rewrites.filter((r) => inW(r.at)).map((r) => r.cycleSeconds);
  const pRuns = arc.reboots.filter((r) => inW(r.at)).map((r) => r.run);
  const pCycles = arc.rewrites.filter((r) => inW(r.at)).map((r) => r.cycle);
  const cols = (runs: number[], cycles: number[]) =>
    `${String(runs.length).padStart(7)}  ${fmt(median(runs)).padStart(7)}  ${String(cycles.length).padStart(8)}  ${fmt(median(cycles)).padStart(9)}`;
  console.log(
    `  ${clock(w * 900).padStart(7)}  ${cols(sRuns, sCycles)}  |  ${cols(pRuns, pCycles)}`,
  );
}

console.log('\nELSEWORLDS — scheduled tiers, spine entered | probe entered → resolved');
walk.slots.forEach((s, i) => {
  const p = arc.elseworlds[i];
  console.log(
    `  ${`${s.id} ${s.tier}`.padEnd(20)} goal ${fmt(s.goal).padStart(9)}  spine ${clock(s.at).padStart(8)}` +
      `  |  probe ${p ? `${clock(p.entered).padStart(8)} → ${clock(p.resolved)}${p.id === s.id ? '' : ` (${p.id} ${p.tier})`}` : '—'}`,
  );
});

console.log('\nEND STATE');
console.log(
  `  reboots ${core.reboots.value}, rewrites ${core.rewrites.value}, ages ${core.ages.value}, canon ${fmt(num(canon.canon.value))} held`,
);
console.log(
  `  legacy earned this cycle ${fmt(num(legacy.legacyEarned.value))}, continuity earned this Age ${fmt(num(continuity.continuityEarned.value))}`,
);
console.log(
  `  output ×${fmt(num(core.output.apply(1)))}, rate ${fmt(num(run.totalRate.value))}/s, price ratio ${num(run.priceRatio.value).toFixed(3)}`,
);
console.log(
  `  elseworld completions ${prestige.elseworlds
    .getAll()
    .map((e) => e.challenge.completions.value)
    .join(
      '/',
    )}, legends ${legends.legends.getAll().filter((e) => e.achievement.earned.value).length}/${legends.legends.getAll().length}`,
);
console.log(`  automation: ${automation.ladder.unlocked.value.join(', ')}`);
console.log(
  arc.anomalies.length ? `\nANOMALIES\n  ${arc.anomalies.join('\n  ')}` : '\nANOMALIES none',
);
arc.dispose();
