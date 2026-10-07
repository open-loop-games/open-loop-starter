/**
 * Producer — allocation probe: what the selection rule is actually worth.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/producer/balance/allocation-probe.ts`
 *
 * The spine declares the allocation rule as the **combinatorial-selection**
 * edge where the closed form stops (`../IDENTITY.md` § Where the closed form
 * stops). Everything else about this economy projects; which class absorbs the
 * next unit of mass does not. This probe is what measures the remainder.
 *
 * It runs the same arc four times, pinning the shipping dispatcher each time
 * (`modules/automation.ts` § AutomationModuleOptions) — the rules under
 * measurement are the ones the game ships, not copies:
 *
 * - `cheapest`, `payback`, `hybrid` — the three engine selection policies, each
 *   with the waiting the module grants it. Only `hybrid` waits for cost.
 * - `no-wait` — `hybrid` with `forceWaitForCost: false`. The control: the same
 *   rule, offered only what is affordable now.
 *
 * Two numbers to read. The SPREAD across the three rules says whether the rule
 * is load-bearing: small means the policy term is nearly inert and the spine's
 * coverage is effectively full. The WAIT gap between `hybrid` and `no-wait`
 * says what saving toward a better pick is worth, with everything else held.
 *
 * It also settles an open question upstream: `studio/open-loop-starter#25`
 * c4920 prices Producer in the "Closes — no policy" row. The spread is the
 * evidence for or against.
 */

import { BEATS } from './beats';
import { hms, runArc, type ArcResult } from './_engine';
import type { DispatchPolicyName } from '../modules';

const HOURS = 8;

interface Run {
  label: string;
  forcePolicy: DispatchPolicyName;
  forceWaitForCost?: boolean;
}

/** The rules a rung could grant. The spread and the manifest windows read these. */
const RULES: Run[] = [
  { label: 'cheapest', forcePolicy: 'cheapest' },
  { label: 'payback', forcePolicy: 'payback' },
  { label: 'hybrid', forcePolicy: 'hybrid' },
];
/** No rung grants this, so it reports beside the rules and never widens a window. */
const CONTROL: Run = { label: 'no-wait', forcePolicy: 'hybrid', forceWaitForCost: false };
const RUNS: Run[] = [...RULES, CONTROL];

const col = (s: string | number, w: number): string => String(s).padEnd(w);
const pad = (s: string | number, w: number): string => String(s).padStart(w);
const spread = (values: number[]): string => {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return 'n/a';
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  return min > 0 ? `${(max / min).toFixed(2)}×` : 'n/a';
};
/** `hybrid` minus `no-wait`, as a signed duration. */
const waitDelta = (withWait: number, without: number): string => {
  if (!Number.isFinite(withWait) || !Number.isFinite(without)) return 'n/a';
  const d = withWait - without;
  return `${d < 0 ? '−' : '+'}${hms(Math.abs(d))}`;
};

async function main(): Promise<void> {
  console.log(`Producer — allocation probe (${HOURS}h per run, shipping dispatcher)\n`);

  const results = new Map<string, ArcResult>();
  for (const run of RUNS) {
    process.stdout.write(`  running ${run.label}…\n`);
    results.set(
      run.label,
      await runArc({
        seconds: HOURS * 3600,
        forcePolicy: run.forcePolicy,
        forceWaitForCost: run.forceWaitForCost,
      }),
    );
  }
  const get = (run: Run): ArcResult => results.get(run.label)!;
  const hybrid = get(RULES[2]);
  const noWait = get(CONTROL);

  console.log('\n═══ Headline outcome ═══\n');
  console.log(
    `  ${col('run', 12)}${pad('rate /s', 14)}${pad('fleet', 8)}${pad('classes', 9)}${pad('revisions', 11)}${pad('refinements', 13)}`,
  );
  for (const run of RUNS) {
    const r = get(run).final;
    console.log(
      `  ${col(run.label, 12)}${pad(r.headlineRate.toExponential(2), 14)}${pad(r.fleetSize, 8)}${pad(r.distinctClasses, 9)}${pad(r.revisionsEarned, 11)}${pad(r.refinementsOwned, 13)}`,
    );
  }
  console.log(
    `\n  rate spread across the rules: ${spread(RULES.map((r) => get(r).final.headlineRate))}` +
      `    hybrid / no-wait: ${(hybrid.final.headlineRate / noWait.final.headlineRate).toFixed(2)}×`,
  );

  const header = (first: string, tail = ''): void =>
    console.log(
      `  ${col(first, 10)}${RUNS.map((r) => pad(r.label, 12)).join('')}${pad('spread', 9)}${pad('wait Δ', 12)}${tail}`,
    );
  const row = (name: string, at: (r: ArcResult) => number, tail = ''): void => {
    const times = RUNS.map((run) => at(get(run)));
    console.log(
      `  ${col(name, 10)}${times.map((t) => pad(Number.isFinite(t) ? hms(t) : 'NEVER', 12)).join('')}` +
        `${pad(spread(times.slice(0, RULES.length)), 9)}${pad(waitDelta(times[2], times[3]), 12)}${tail}`,
    );
  };

  console.log('\n═══ Time to deploy each class ═══\n');
  header('class');
  for (const c of hybrid.finalCounts) row(c.name, (r) => r.classAt.get(c.id) ?? Infinity);

  console.log('\n═══ Time to each beat ═══\n');
  header('beat', '  label');
  for (const beat of BEATS) {
    row(String(beat.n), (r) => r.beatAt.get(beat.n) ?? Infinity, `  ${beat.label}`);
  }

  console.log('\n═══ Final ladder shape ═══\n');
  console.log(
    `  ${col('run', 12)}${hybrid.finalCounts.map((c) => pad(c.name.slice(0, 7), 9)).join('')}`,
  );
  for (const run of RUNS) {
    console.log(
      `  ${col(run.label, 12)}${get(run)
        .finalCounts.map((c) => pad(c.count, 9))
        .join('')}`,
    );
  }

  console.log('\n═══ What saving does ═══\n');
  for (const run of RUNS) {
    const r = get(run);
    console.log(
      `  ${col(run.label, 12)}held ${pad(hms(r.holdSeconds), 8)}` +
        `    refinements bought while held: ${pad(r.refinementsWhileHolding.count, 3)}` +
        ` (${r.refinementsWhileHolding.mass.toExponential(2)} mass)`,
    );
  }
  console.log(
    `\n  The player and the dispatcher share one wallet. While hybrid holds, mass\n` +
      `  banks, refinements come within reach sooner and the player buys them out\n` +
      `  of the savings. So the wait Δ is saving plus the refinements it brings\n` +
      `  forward, not saving alone. The player is the same in every run, so the\n` +
      `  gap is still the rule's — it is just not only the dispatcher's.\n`,
  );

  console.log('═══ Recorded windows for manifest.ts — the three rules, control excluded ═══\n');
  for (const beat of BEATS) {
    const times = RULES.map((run) => get(run).beatAt.get(beat.n)).filter(
      (t): t is number => t !== undefined,
    );
    const range = times.length ? `[${Math.min(...times)}, ${Math.max(...times)}]` : 'never landed';
    console.log(`  beat ${beat.n}: ${range}`);
  }

  console.log(
    `\nRead the spread, not the winner. What the shipping ladder grants is\n` +
      `cheapest at the first rung and hybrid at the top; whether the middle rule\n` +
      `earns a rung of its own is what the middle column is here to answer.\n`,
  );
}

void main();
