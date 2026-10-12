/**
 * Producer — closed-form balance projection (NO engine state).
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/producer/balance/producer-projection.ts`
 *
 * The spine in runnable form (`.claude/rules/archetype-authoring.md` § Balance
 * — where each surface goes). It predicts; it does not discover. Everything
 * here is arithmetic over `../data/`, with one engine import — the harness's
 * `classifyFlowChannel`, a pure band classifier whose thresholds this file
 * would otherwise restate by hand.
 *
 * Bucket: exponential family under piecewise × modifier-product composition
 * (`../IDENTITY.md` § Rate-function spine). What it can close, it closes here;
 * where it stops — the allocation rule, the combinatorial-selection edge — it
 * says so and hands off to `allocation-probe.ts`.
 */

import { classifyFlowChannel } from '@open-loop/engine';
import {
  COST_RATIO,
  OPENING_BEAT_SECONDS,
  TARGET_BEAT_LEVEL,
  TARGET_BEAT_SECONDS,
  CLASS_COST_STEP,
  CLASS_RATE_STEP,
  GENERATION_STEP,
  PROBE_CLASSES,
  REFINEMENTS,
  REVISIONS,
  DEFAULT_REVISION_MULTIPLIER,
} from '../data';

const col = (s: string | number, w: number): string => String(s).padEnd(w);
const pad = (s: string | number, w: number): string => String(s).padStart(w);
const hms = (s: number): string =>
  s >= 3600
    ? `${(s / 3600).toFixed(2)}h`
    : s >= 60
      ? `${(s / 60).toFixed(1)}m`
      : `${s.toFixed(0)}s`;

// ── 1. The one derived number ───────────────────────────────────────────────
function reportCostRatio(): void {
  const derived = (TARGET_BEAT_SECONDS / OPENING_BEAT_SECONDS) ** (1 / (TARGET_BEAT_LEVEL - 1));
  const drift = ((COST_RATIO - derived) / derived) * 100;
  const doubling = Math.LN2 / Math.log(COST_RATIO);

  console.log('═══ 1. The cost ratio is derived, not chosen ═══\n');
  console.log(
    `  authored: T_1 = ${OPENING_BEAT_SECONDS}s, T_${TARGET_BEAT_LEVEL} = ${TARGET_BEAT_SECONDS}s`,
  );
  console.log(`  m = (T_n / T_1)^(1/(n−1)) = ${derived.toFixed(6)}`);
  console.log(`  data/curve.ts COST_RATIO  = ${COST_RATIO}   (drift ${drift.toFixed(3)}%)`);
  console.log(`  doubling time             = ${doubling.toFixed(3)} purchases`);
  console.log(
    `\n  Cookie Clicker ships 1.15. Reproduced here to ${(((COST_RATIO - 1.15) / 1.15) * 100).toFixed(1)}% from beat\n` +
      `  times alone — a convergence receipt, not a lift.`,
  );
}

// ── 2. The isolated ladder, and what it does not say ────────────────────────
function reportIsolatedBeats(): void {
  console.log('\n═══ 2. Beat time on the isolated ladder — T(n) = T_1 · m^(n−1) ═══\n');
  console.log(`  ${col('n', 6)}${pad('T(n)', 10)}   channel`);
  let previous = '';
  for (let n = 1; n <= 40; n++) {
    const t = OPENING_BEAT_SECONDS * COST_RATIO ** (n - 1);
    const channel = classifyFlowChannel(t);
    if (channel !== previous) {
      console.log(`  ${col(n, 6)}${pad(hms(t), 10)}   → ${channel}`);
      previous = channel;
    }
  }
  console.log(
    `\n  HOLDS INCOME CONSTANT, so this sizes m and does NOT predict felt cadence.\n` +
      `  Realized beat is a·m^n / (n · r · Π μ); both the n and the stack flatten it.\n` +
      `  Measured against this: see § 4 and arc-probe.ts.`,
  );
}

// ── 3. The ladder and the stack ─────────────────────────────────────────────
function reportLadder(): void {
  console.log('\n═══ 3. The ladder ═══\n');
  console.log(`  ${col('class', 10)}${pad('a_i', 14)}${pad('r_i', 12)}${pad('a/r (s)', 10)}`);
  for (const c of PROBE_CLASSES) {
    const a = Number(c.baseCost);
    const r = Number(c.baseRate);
    console.log(
      `  ${col(c.name, 10)}${pad(a.toLocaleString(), 14)}${pad(r.toLocaleString(), 12)}${pad((a / r).toFixed(0), 10)}`,
    );
  }
  console.log(
    `\n  cost ×${CLASS_COST_STEP} / rate ×${CLASS_RATE_STEP} per class → self-payback climbs ×${(CLASS_COST_STEP / CLASS_RATE_STEP).toFixed(2)},\n` +
      `  so every class opener is worse than the one below it at count zero.`,
  );

  const perClassRefine = REFINEMENTS.filter((r) => r.scope.kind === 'class').length
    ? REFINEMENTS.filter((r) => r.scope.kind === 'class' && r.scope.classId === 'seed').reduce(
        (a, r) => a * Number(r.multiplier),
        1,
      )
    : 1;
  const globalRefine = REFINEMENTS.filter((r) => r.scope.kind === 'global').reduce(
    (a, r) => a * Number(r.multiplier),
    1,
  );
  const clickRefine = REFINEMENTS.filter((r) => r.scope.kind === 'click').reduce(
    (a, r) => a * Number(r.multiplier),
    1,
  );
  const revisionProduct = REVISIONS.reduce(
    (a, r) => a * Number(r.multiplier ?? DEFAULT_REVISION_MULTIPLIER),
    1,
  );
  const generation = (1 + GENERATION_STEP) ** PROBE_CLASSES.length;

  console.log('\n  The four chains at full completion (Π μ on one class):');
  console.log(
    `    refinements  ${(perClassRefine * globalRefine).toFixed(2)}×   (per-class ${perClassRefine}× · global ${globalRefine.toFixed(2)}×)`,
  );
  console.log(`    revisions    ${revisionProduct.toFixed(3)}×`);
  console.log(`    generation   ${generation.toFixed(3)}×`);
  console.log(`    ─────────────────────────`);
  console.log(
    `    product      ${(perClassRefine * globalRefine * revisionProduct * generation).toFixed(2)}×`,
  );
  console.log(`\n  click chain (its own, nothing global binds to it): ${clickRefine}×`);
}

// ── 4. The uniform-depth reference arc ──────────────────────────────────────
/**
 * The projection's answer to "how long is the arc?", under the one allocation
 * that closes in arithmetic: hold every class at equal depth. Time to step the
 * whole ladder from depth n to n+1 is
 *
 *     Δt(n) = (Σ a_i) · m^n / ( n · (Σ r_i) · Π μ(n) )
 *
 * which sums. This is NOT what the game does — the shipping dispatcher picks
 * one class at a time by payback, and picking well is worth something this
 * reference cannot see. That difference is the whole content of the
 * combinatorial-selection boundary, and `allocation-probe.ts` measures it.
 */
function reportUniformDepthArc(): void {
  const sumA = PROBE_CLASSES.reduce((a, c) => a + Number(c.baseCost), 0);
  const sumR = PROBE_CLASSES.reduce((a, c) => a + Number(c.baseRate), 0);

  // Stack at uniform depth n: generation is full (every class deployed at n≥1);
  // revisions and refinements fire on count thresholds, so they step with n.
  const stackAt = (n: number): number => {
    const generation = (1 + GENERATION_STEP) ** PROBE_CLASSES.length;
    const revisions = REVISIONS.filter((r) => {
      // Only the per-class family is legible at uniform depth; fleet-count and
      // lifetime families need the arc, so this is a floor, not the true stack.
      return n >= 25 && r.id.endsWith('-doctrine');
    }).reduce((a, r) => a * Number(r.multiplier ?? DEFAULT_REVISION_MULTIPLIER), 1);
    const refinements = [10, 50].filter((d) => n >= d).reduce((a) => a * 2, 1);
    return generation * revisions * refinements;
  };

  console.log('\n═══ 4. Uniform-depth reference arc (closed; NOT the shipping allocation) ═══\n');
  console.log(
    `  Σa_i = ${sumA.toLocaleString()}   Σr_i = ${sumR.toLocaleString()}   Σa/Σr = ${(sumA / sumR).toFixed(1)}s`,
  );
  console.log(`\n  ${col('depth', 8)}${pad('elapsed', 12)}${pad('income/s', 16)}${pad('Πμ', 8)}`);

  let t = 0;
  for (let n = 1; n <= 60; n++) {
    const stack = stackAt(n);
    const income = n * sumR * stack;
    t += (sumA * COST_RATIO ** n) / income;
    if (n % 10 === 0 || n === 1) {
      console.log(
        `  ${col(n, 8)}${pad(hms(t), 12)}${pad(income.toExponential(2), 16)}${pad(stack.toFixed(2), 8)}`,
      );
    }
  }
  console.log(
    `\n  Reference only. The shipping dispatcher never holds uniform depth — it\n` +
      `  buys one class at a time by payback, which is the term this projection\n` +
      `  cannot carry (../IDENTITY.md § Where the closed form stops).`,
  );
}

function main(): void {
  console.log(
    'Producer — closed-form projection (exponential family, piecewise × modifier-product)\n',
  );
  reportCostRatio();
  reportIsolatedBeats();
  reportLadder();
  reportUniformDepthArc();
  console.log('\nWhat this file cannot answer: which class absorbs the next unit of mass.');
  console.log('That is allocation-probe.ts, and it drives the shipping dispatcher to do it.\n');
}

main();
