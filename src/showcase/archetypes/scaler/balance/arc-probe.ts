/**
 * Scaler: arc probe. Plays the shipping game headless under the reference
 * player and prints each beat beside the spine's prediction. Prints; never
 * asserts. The game has no RNG, so one run is the measurement.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/scaler/balance/arc-probe.ts [seconds] [--beats]`
 *
 * How to read it:
 * - § beats, with `--beats`: every scanner line and tier opening, in order.
 * - § tier openings: the first timeline's openings against the ladder model,
 *   with the units held of the tier below; `hold` is fitted to this column.
 * - § reboots: each Reboot of the spine's reference walk beside the engine's:
 *   timeline length, when, Legacy earned since the last Rewrite, and the output
 *   multiplier during the timeline. `cyc` is the Rewrite cycle.
 * - § rewrites: each Rewrite cycle's length, spine against engine.
 * - § Elseworlds and § end state: goals, completions and the final stack.
 */

import {
  ANCHORS,
  CONTINUITY_POWER,
  ELSEWORLD_GOALS,
  PREDICTION,
  SOFTCAP_KNEE,
  TIERS,
} from '../data';
import { num, runArc, DT } from './_engine';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const SECONDS = Number(args[0] ?? 5400);
const LIST = process.argv.includes('--beats');
const fmt = (x: number) => (Math.abs(x) >= 1e4 ? x.toExponential(2) : x.toFixed(x < 10 ? 2 : 0));

const arc = runArc(SECONDS);
const { core, run, legacy, continuity, prestige, legends, automation } = arc;

console.log(
  `\nSCALER probe — ${SECONDS}s sim at dt=${DT}s, one deterministic run (no RNG in the game)\n`,
);
if (LIST) {
  console.log('BEATS');
  for (const b of arc.beats) console.log(`  ${fmt(b.at).padStart(7)}s  ${b.text}`);
}

console.log('\nTIER OPENINGS, first run — spine vs probe (seconds into the run)');
TIERS.forEach((tier, i) => {
  const pred = PREDICTION.tierOpens[i];
  const got = arc.firstRunOpens[i];
  const run2 = arc.secondRunOpens[i];
  console.log(
    `  ${tier.displayName.padEnd(16)} spine ${fmt(pred).padStart(6)}  probe ${got === undefined ? '   —' : fmt(got).padStart(6)}` +
      `  ratio ${got === undefined || i === 0 ? '—' : (got / pred).toFixed(2)}  |  2nd run ${run2 === undefined ? '—' : fmt(run2)}` +
      (arc.heldAtOpen[i] === undefined
        ? ''
        : `  |  held when next opened: ${arc.heldAtOpen[i]} (spine ${ANCHORS.hold})`),
  );
});

console.log(
  `\nREBOOTS — spine walk (knee ${SOFTCAP_KNEE}, continuity power ${CONTINUITY_POWER.toFixed(3)}) vs probe`,
);
console.log(
  '   #  cyc  spine run  spine at  spine E  spine mult  |  probe run  probe at  probe E  probe mult',
);
const steps = PREDICTION.walk.steps;
for (let i = 0; i < Math.min(Math.max(arc.reboots.length, steps.length), 40); i++) {
  const s = steps[i];
  const p = arc.reboots[i];
  const spine = s
    ? `${String(s.cycle).padStart(3)}  ${fmt(s.runSeconds).padStart(9)}  ${fmt(s.atSeconds).padStart(8)}  ${String(s.legacyEarned).padStart(7)}  ${fmt(s.outputMult).padStart(10)}`
    : ''.padStart(45);
  const probe = p
    ? `${fmt(p.run).padStart(9)}  ${fmt(p.at).padStart(8)}  ${String(p.earned).padStart(7)}  ${fmt(p.mult)}`
    : '—';
  console.log(`  ${String(i + 1).padStart(2)}  ${spine}  |  ${probe}`);
}

console.log('\nREWRITE CYCLES — spine vs probe (cycle seconds)');
PREDICTION.walk.cycles.forEach((c, i) => {
  const got = arc.rewrites[i];
  console.log(
    `  ${c.rewrite}  spine ${fmt(c.cycleSeconds).padStart(6)} (at ${fmt(c.atSeconds)}, +${c.continuityGain})` +
      `  probe ${got ? `${fmt(got.cycle).padStart(6)} (at ${fmt(got.at)}, +${got.gain})` : '—'}`,
  );
});

console.log(
  '\nELSEWORLD GOALS (run justice):',
  Object.fromEntries(Object.entries(ELSEWORLD_GOALS).map(([k, v]) => [k, fmt(v)])),
);
for (const { def, challenge } of prestige.elseworlds.getAll()) {
  console.log(`  ${def.displayName.padEnd(24)} completions ${challenge.completions.value}`);
}

console.log('\nEND STATE');
console.log(
  `  reboots ${core.reboots.value}, rewrites ${core.rewrites.value}, continuity ${fmt(num(continuity.continuity.value))}`,
);
console.log(
  `  legacy earned this cycle ${fmt(num(legacy.legacyEarned.value))}, held ${fmt(num(legacy.legacy.value))}`,
);
console.log(
  `  output ×${fmt(num(core.output.apply(1)))}, rate ${fmt(num(run.totalRate.value))}/s, price ratio ${num(run.priceRatio.value).toFixed(3)}`,
);
console.log(
  `  legends ${legends.legends.getAll().filter((e) => e.achievement.earned.value).length}/${legends.legends.getAll().length}`,
);
console.log(`  automation: ${automation.ladder.unlocked.value.join(', ')}`);
console.log(
  arc.anomalies.length ? `\nANOMALIES\n  ${arc.anomalies.join('\n  ')}` : '\nANOMALIES none',
);
arc.dispose();
