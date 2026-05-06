/**
 * Scaler verify-driver — methodology #2 verify half + #1↔#2 bridge.
 *
 * Walks the antimatter strict-tier-order schedule under both:
 *   - Closed-form predictor: `arcWaypoints` from `spec.ts` (engine
 *     queried at frozen state).
 *   - Schedule-replay sim: `runUntil(affordable)` per step + manual state
 *     mutation; production accumulates via the engine's own tick.
 *
 * Diffs cumulative sim-time vs predicted-time per waypoint with tolerance.
 * Per `archetypes/BALANCING.md § Theme 3 #2` and `§ Engine as oracle`.
 *
 * Predictor and sim walk the *same* schedule — drift indicates an engine-
 * side primitive (`getCost`/`getTotalRate`) regression OR (at sub-leaf B)
 * the achievement-fire splice gap that closes when sub-leaf C migrates
 * achievements onto Gate. Until C lands, expect the same monotonic
 * ~3–6% per-waypoint drift producer surfaced pre-Gate.
 *
 * Sub-leaf B scope: **antimatter slice only**. Prestige (D) and ECC (E)
 * verify-drivers are TODO; their predictor halves don't exist yet.
 *
 *   pnpm exec vite-node src/archetypes/scaler/balance/verify.ts
 */

import { Decimal, runUntil, type Engine } from 'open-loop-engine';
import { createScalerEngine } from '..';
import { ScalerTiersKey, type ScalerTier } from '../modules/tiers';
import {
  antimatterStrictTierOrderSchedule,
  arcWaypoints,
  type ArcWaypoint,
  type ScheduleStep,
} from './spec';

// Sub-leaf B uses a shallow per-tier walk so the no-bot sim can complete
// across all 5 antimatter producers within budget. With baseRates 0.1 →
// 8000 and a 1.15× cost ramp, perTierCount=25 across 5 tiers exhausts a
// 4.5h budget at the deeper tiers; the deliverable here is "verify
// produces a predictor↔sim diff," not a full canonical schedule. Sub-leaf
// C will widen + retune as part of antimatter calibration.
const PER_TIER_COUNT = 3;
const TOLERANCE_PCT = 0.05;
const BUDGET_SEC = 90 * 60 * 3; // 4.5h — generous within slim-port time scale

let engineCounter = 0;

function buildVerifyEngine(): Engine {
  const { engine } = createScalerEngine(undefined, {
    persistenceNamespace: `verify-${++engineCounter}`,
  });
  engine.selectMod('synergism-slim');
  engine.start();
  engine.stop();
  return engine;
}

function getAntimatterTier(engine: Engine): ScalerTier {
  const tiers = engine.tryInject(ScalerTiersKey);
  if (!tiers) throw new Error('verify: ScalerTiersKey not provided by engine');
  const tier = tiers.find((t) => t.id === 'antimatter');
  if (!tier) throw new Error('verify: antimatter tier missing from ScalerTiersKey');
  return tier;
}

/**
 * Replay the antimatter schedule under sim. For each step:
 *   1. `runUntil(coins >= cost)` — let production accumulate.
 *   2. Apply step manually: decrement coins, increment count or activate
 *      upgrade.
 *   3. Record cumulative sim-time.
 *
 * No bot installed; the engine's internal tick logic (modifier chain,
 * resource accumulation) runs but no auto-buy decisions fire.
 */
function simulateSchedule(
  engine: Engine,
  schedule: readonly ScheduleStep[],
  initial: Readonly<Record<string, number>>,
): ArcWaypoint[] {
  const tier = getAntimatterTier(engine);
  const coin = tier.currency;
  if (!tier.upgrades) {
    throw new Error('verify: antimatter tier has no upgrades category');
  }
  const upgrades = tier.upgrades;

  // Reset state.
  for (const entry of tier.producers.getAll()) {
    if (entry.producer.trigger !== 'continuous' || !entry.producer.repeatable) continue;
    entry.producer.repeatable.amount.value = initial[entry.def.id] ?? 0;
  }
  for (const entry of upgrades.getAll()) {
    if (entry.purchasable.active.value) entry.purchasable.amount.value = 0;
  }
  coin.value = Decimal.dZero;

  const out: ArcWaypoint[] = [];
  let cumulativeSec = 0;

  for (const step of schedule) {
    if (step.kind === 'tier') {
      const p = tier.producers.getProducer(step.id);
      if (!p?.repeatable) throw new Error(`verify: no continuous producer '${step.id}'`);
      const from = Number(p.repeatable.amount.value);

      for (let k = from; k < step.to; k++) {
        const cost = Decimal.fromValue(p.repeatable.getCost(1)).toNumber();
        const remaining = BUDGET_SEC - cumulativeSec;
        if (remaining <= 0) {
          throw new Error(
            `verify: budget exhausted before tier '${step.id}' step ${k + 1}/${step.to}`,
          );
        }
        const result = runUntil({
          engine,
          until: () => Decimal.gte(coin.value, cost),
          maxSimTime: remaining,
          tickDelta: 1,
        });
        if (result.terminated !== 'predicate') {
          throw new Error(
            `verify: unaffordable cost ${cost} for '${step.id}' at sim-time ${cumulativeSec + result.elapsedSimulated}s`,
          );
        }
        cumulativeSec += result.elapsedSimulated;
        coin.value = Decimal.sub(coin.value, cost);
        p.repeatable.amount.value = k + 1;
      }
      out.push({ step, atSec: cumulativeSec, counts: snapshotCounts(engine) });
    } else {
      const u = upgrades.getPurchasable(step.id);
      if (!u) throw new Error(`verify: no upgrade '${step.id}'`);
      if (!u.active.value) {
        const cost = Decimal.fromValue(u.getCost(1)).toNumber();
        const remaining = BUDGET_SEC - cumulativeSec;
        const result = runUntil({
          engine,
          until: () => Decimal.gte(coin.value, cost),
          maxSimTime: remaining,
          tickDelta: 1,
        });
        if (result.terminated !== 'predicate') {
          throw new Error(
            `verify: unaffordable upgrade '${step.id}' at sim-time ${cumulativeSec + result.elapsedSimulated}s`,
          );
        }
        cumulativeSec += result.elapsedSimulated;
        coin.value = Decimal.sub(coin.value, cost);
        u.amount.value = 1;
      }
      out.push({ step, atSec: cumulativeSec, counts: snapshotCounts(engine) });
    }
  }
  return out;
}

function snapshotCounts(engine: Engine): Record<string, number> {
  const counts: Record<string, number> = {};
  const tier = getAntimatterTier(engine);
  for (const entry of tier.producers.getAll()) {
    if (entry.producer.trigger !== 'continuous') continue;
    counts[entry.def.id] = Number(entry.producer.repeatable?.amount.value ?? 0);
  }
  return counts;
}

interface DiffRow {
  index: number;
  step: ScheduleStep;
  predictedSec: number;
  simulatedSec: number;
  deltaSec: number;
  deltaPct: number;
  withinTolerance: boolean;
}

function diff(predicted: readonly ArcWaypoint[], simulated: readonly ArcWaypoint[]): DiffRow[] {
  if (predicted.length !== simulated.length) {
    throw new Error(`length mismatch: predicted=${predicted.length} simulated=${simulated.length}`);
  }
  const rows: DiffRow[] = [];
  for (let i = 0; i < predicted.length; i++) {
    const p = predicted[i]!;
    const s = simulated[i]!;
    const deltaSec = s.atSec - p.atSec;
    const deltaPct = p.atSec > 0 ? Math.abs(deltaSec) / p.atSec : 0;
    rows.push({
      index: i + 1,
      step: p.step,
      predictedSec: p.atSec,
      simulatedSec: s.atSec,
      deltaSec,
      deltaPct,
      withinTolerance: deltaPct <= TOLERANCE_PCT,
    });
  }
  return rows;
}

function fmt(sec: number): string {
  if (!isFinite(sec)) return '∞';
  if (Math.abs(sec) < 1) return `${sec.toFixed(2)}s`;
  const sign = sec < 0 ? '-' : '';
  const total = Math.round(Math.abs(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${sign}${m}m${String(s).padStart(2, '0')}s` : `${sign}${s}s`;
}

function describeStep(s: ScheduleStep): string {
  return s.kind === 'tier' ? `tier ${s.id} → ${s.to}` : `buy ${s.id}`;
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

function main(): void {
  const t0 = Date.now();

  console.log('# Scaler sim-verify (antimatter slice) — methodology #2 verification\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log(
    'Predictor (closed-form via spec.ts arcWaypoints) vs sim (runUntil per step). Same schedule, two execution paths.',
  );
  console.log(`Tolerance: ${(TOLERANCE_PCT * 100).toFixed(1)}% per-waypoint.`);
  console.log(
    'Sub-leaf B note: scaler achievements still use legacy predicate vtable (modules/achievements.ts).',
  );
  console.log('Predictor splice loop will return +∞ until sub-leaf C migrates onto Gate.\n');

  // Walk first 2 tiers at sub-leaf B — cost-vs-rate ratios past tier 3
  // exceed budget under no-bot sim; full-tier walking is sub-leaf C.
  const schedule = antimatterStrictTierOrderSchedule({
    perTierCount: PER_TIER_COUNT,
    tierCount: 2,
  });
  // Seed Worker=1 to skip the bootstrap regime: scaler antimatter has no
  // click bot, so production needs at least one Worker to start
  // accumulating. With count=0 and value=0 coin, getTotalRate is zero and
  // both predictor (+∞) and sim (unaffordable) cannot make progress.
  // Mirrors producer's `initial: { cursor: 1 }` shape.
  const initial: Record<string, number> = { 'antimatter-1': 1 };

  console.log('## Predicting...');
  const predicted = arcWaypoints(schedule, initial);

  console.log('## Simulating...');
  const engine = buildVerifyEngine();
  const simulated = simulateSchedule(engine, schedule, initial);

  const rows = diff(predicted, simulated);

  console.log();
  console.log(
    renderTable(
      ['#', 'step', 'predicted', 'simulated', 'Δ', 'Δ%', 'pass'],
      rows.map((r) => [
        String(r.index),
        describeStep(r.step),
        fmt(r.predictedSec),
        fmt(r.simulatedSec),
        fmt(r.deltaSec),
        `${(r.deltaPct * 100).toFixed(2)}%`,
        r.withinTolerance ? 'yes' : 'NO',
      ]),
    ),
  );

  const failed = rows.filter((r) => !r.withinTolerance);
  console.log();
  if (failed.length > 0) {
    console.log(
      `Tolerance breach: ${failed.length}/${rows.length} waypoints exceed ${TOLERANCE_PCT * 100}%.`,
    );
    console.log(
      'Pre-sub-leaf-C: drift is the expected signal — Gate migration closes the gap structurally.',
    );
    process.exitCode = 1;
  } else {
    console.log(`All ${rows.length} waypoints within tolerance. Predictor agrees with sim.`);
  }

  console.log(`\n(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
