/**
 * Producer — arc probe: the shipping game, walked end to end.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/producer/balance/arc-probe.ts`
 *
 * Drives the REAL assembled engine and the shipping dispatcher (`_engine.ts`
 * supplies only the manual openers a player works) and records where each beat
 * lands. It prints; it does not assert — a probe that disagrees with the
 * projection has done its job.
 *
 * This is the archetype's walkthrough check: the first surface that walks
 * ladder → resource → predicate → beat, and the place structural defects show
 * up rather than tuning ones.
 */

import { classifyFlowChannel } from '@open-loop/engine';
import { BEATS, CLICK_CEILING_PER_SECOND } from './beats';
import { hms, runArc } from './_engine';
import { COST_RATIO, OPENING_BEAT_SECONDS } from '../data';

const HOURS = 8;
const col = (s: string | number, w: number): string => String(s).padEnd(w);
const pad = (s: string | number, w: number): string => String(s).padStart(w);

async function main(): Promise<void> {
  console.log(`Producer — arc probe (${HOURS}h, shipping ladder, real engine)\n`);

  const arc = await runArc({ seconds: HOURS * 3600 });

  console.log('═══ Beats ═══\n');
  for (const beat of BEATS) {
    const t = arc.beatAt.get(beat.n);
    console.log(
      `  ${col(beat.n, 4)}${pad(t === undefined ? 'NEVER' : hms(t), 10)}   ${beat.label}`,
    );
  }

  console.log('\n═══ The ladder as it was actually walked ═══\n');
  console.log(`  ${col('class', 10)}${pad('first bought', 14)}${pad('final count', 14)}`);
  for (const entry of arc.finalCounts) {
    const t = arc.classAt.get(entry.id);
    console.log(
      `  ${col(entry.name, 10)}${pad(t === undefined ? 'NEVER' : hms(t), 14)}${pad(entry.count, 14)}`,
    );
  }

  console.log('\n═══ Dispatch ═══\n');
  for (const [tier, t] of arc.tierAt) console.log(`  ${col(tier, 12)}${pad(hms(t), 10)}`);
  console.log(`  ${col('hand-buys', 12)}${pad(arc.handBuys, 10)}   before dispatch opened`);

  console.log('\n═══ Final state ═══\n');
  console.log(`  headline rate      ${arc.final.headlineRate.toExponential(3)} /s`);
  console.log(`  fleet size         ${arc.final.fleetSize}`);
  console.log(`  distinct classes   ${arc.final.distinctClasses}/${arc.finalCounts.length}`);
  console.log(`  refinements owned  ${arc.final.refinementsOwned}`);
  console.log(`  revisions earned   ${arc.final.revisionsEarned}`);
  console.log(`  opening-class Πμ   ${arc.openingClassStack.toFixed(2)}×`);

  // ── Realized vs isolated beat, the correction this probe exists to keep honest ──
  console.log('\n═══ Realized beat vs the isolated ladder ═══\n');
  const opening = arc.finalCounts[0];
  const realizedAverage = (HOURS * 3600) / Math.max(opening.count, 1);
  const isolated = OPENING_BEAT_SECONDS * COST_RATIO ** (opening.count - 1);
  console.log(`  ${opening.name} reached ${opening.count} units in ${HOURS}h.`);
  console.log(
    `    realized average beat   ${realizedAverage.toFixed(1)}s  → ${classifyFlowChannel(realizedAverage)}`,
  );
  console.log(
    `    isolated-ladder T(n)    ${isolated.toExponential(2)}s  → ${classifyFlowChannel(isolated)}`,
  );
  console.log(
    `\n  The gap is income growth, and it is the reason data/curve.ts reads its\n` +
      `  flow-channel map as cost escalation rather than as felt cadence.`,
  );

  console.log('\n═══ The click hand-off ═══\n');
  const beat2 = arc.beatAt.get(2);
  const foundry = arc.classAt.get('foundry');
  console.log(`  click ceiling        ${CLICK_CEILING_PER_SECOND}/s`);
  console.log(`  ladder passes it     ${beat2 === undefined ? 'NEVER' : hms(beat2)}`);
  console.log(`  third class bought   ${foundry === undefined ? 'NEVER' : hms(foundry)}`);
  console.log(
    `\n  data/refinements.ts § Balance predicts the hand-off lands in the third\n` +
      `  class. Compare the two lines above rather than trusting the prose.`,
  );

  console.log('\ndone.\n');
}

void main();
