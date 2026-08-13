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
 * It runs the same arc three times, pinning the shipping dispatcher to each of
 * the three engine selection policies in turn (`modules/automation.ts`
 * § AutomationModuleOptions.forcePolicy) — the rules under measurement are the
 * ones the game ships, not copies.
 *
 * The number to read is the SPREAD. A small one says the policy term is nearly
 * inert and the spine's coverage is effectively full; a large one says the rule
 * is load-bearing and belongs in every statement of the spine.
 *
 * It also settles an open question upstream: `studio/open-loop-starter#25`
 * c4920 prices Producer in the "Closes — no policy" row. The spread is the
 * evidence for or against.
 */

import { BEATS } from './beats';
import { hms, runArc, type ArcResult } from './_engine';
import type { DispatchPolicyName } from '../modules';

const HOURS = 8;
const POLICIES: DispatchPolicyName[] = ['cheapest', 'payback', 'hybrid'];

const col = (s: string | number, w: number): string => String(s).padEnd(w);
const pad = (s: string | number, w: number): string => String(s).padStart(w);
const spread = (values: number[]): string => {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return 'n/a';
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  return min > 0 ? `${(max / min).toFixed(2)}×` : 'n/a';
};

async function main(): Promise<void> {
  console.log(`Producer — allocation probe (${HOURS}h per rule, shipping dispatcher)\n`);

  const results = new Map<DispatchPolicyName, ArcResult>();
  for (const policy of POLICIES) {
    process.stdout.write(`  running ${policy}…\n`);
    results.set(policy, await runArc({ seconds: HOURS * 3600, forcePolicy: policy }));
  }

  console.log('\n═══ Headline outcome ═══\n');
  console.log(
    `  ${col('rule', 12)}${pad('rate /s', 14)}${pad('fleet', 8)}${pad('classes', 9)}${pad('revisions', 11)}${pad('refinements', 13)}`,
  );
  for (const policy of POLICIES) {
    const r = results.get(policy)!.final;
    console.log(
      `  ${col(policy, 12)}${pad(r.headlineRate.toExponential(2), 14)}${pad(r.fleetSize, 8)}${pad(r.distinctClasses, 9)}${pad(r.revisionsEarned, 11)}${pad(r.refinementsOwned, 13)}`,
    );
  }
  console.log(
    `\n  rate spread: ${spread(POLICIES.map((p) => results.get(p)!.final.headlineRate))}`,
  );

  console.log('\n═══ Time to deploy each class ═══\n');
  const classIds = results.get('hybrid')!.finalCounts.map((c) => c);
  console.log(
    `  ${col('class', 10)}${POLICIES.map((p) => pad(p, 12)).join('')}${pad('spread', 10)}`,
  );
  for (const entry of classIds) {
    const times = POLICIES.map((p) => results.get(p)!.classAt.get(entry.id) ?? Infinity);
    console.log(
      `  ${col(entry.name, 10)}${times.map((t) => pad(Number.isFinite(t) ? hms(t) : 'NEVER', 12)).join('')}${pad(spread(times), 10)}`,
    );
  }

  console.log('\n═══ Time to each beat ═══\n');
  console.log(
    `  ${col('beat', 6)}${POLICIES.map((p) => pad(p, 12)).join('')}${pad('spread', 10)}  label`,
  );
  for (const beat of BEATS) {
    const times = POLICIES.map((p) => results.get(p)!.beatAt.get(beat.n) ?? Infinity);
    console.log(
      `  ${col(beat.n, 6)}${times.map((t) => pad(Number.isFinite(t) ? hms(t) : 'NEVER', 12)).join('')}${pad(spread(times), 10)}  ${beat.label}`,
    );
  }

  console.log('\n═══ Final ladder shape ═══\n');
  console.log(`  ${col('rule', 12)}${classIds.map((c) => pad(c.name.slice(0, 7), 9)).join('')}`);
  for (const policy of POLICIES) {
    const counts = results.get(policy)!.finalCounts;
    console.log(`  ${col(policy, 12)}${counts.map((c) => pad(c.count, 9)).join('')}`);
  }

  console.log(
    `\nRead the spread, not the winner. What the shipping ladder grants is\n` +
      `cheapest at the first rung and hybrid at the top; whether the middle rule\n` +
      `earns a rung of its own is what the middle column is here to answer.\n`,
  );

  console.log('═══ What this sweep does NOT exercise ═══\n');
  console.log(
    `  \`setupPolicyAutoPurchase\` filters candidates by \`canPurchase\` BEFORE\n` +
      `  calling \`policy.pick\`, so every candidate a policy sees is already\n` +
      `  affordable. \`selectionHybridPayback\`'s wait term is\n` +
      `  \`max(cost − (resource − reserve), 0)\`, which is therefore ALWAYS ZERO\n` +
      `  under this driver — for any reserve, since the filter uses the same\n` +
      `  comparison. Hybrid still differs from payback (its second term divides\n` +
      `  by per-unit rate where \`purchaseBeatSeconds\` amortizes across the owned\n` +
      `  stack), so the three columns are three real rules. But the\n` +
      `  save-toward-something-better decision is not among them.\n\n` +
      `  So a flat spread here says "picking among AFFORDABLE candidates barely\n` +
      `  matters in this economy". It does not say "allocation does not matter".\n` +
      `  Testing that needs a driver that can decline to buy — which the engine's\n` +
      `  own auto-purchase helper structurally cannot.\n`,
  );
}

void main();
