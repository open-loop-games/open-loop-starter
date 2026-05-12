/**
 * Producer verify-driver — methodology #2 verify half + #1↔#2 bridge.
 *
 * Walks producer's strict-tier-order schedule under both:
 *   - Closed-form predictor: `arcWaypoints` from `spec.ts` (engine queried
 *     at frozen state).
 *   - Schedule-replay sim: `runUntil(affordable)` per step + manual state
 *     mutation; production accumulates via the engine's own tick.
 *
 * Diffs cumulative sim-time vs predicted-time per waypoint with tolerance.
 * Per `archetypes/BALANCING.md § Theme 3 #2` and `§ Engine as oracle`.
 *
 * Predictor and sim walk the *same* schedule — drift indicates an engine-
 * side primitive (`getCost`/`getTotalRate`) regression, not a bot policy
 * difference. This file is methodology #2's missing verify half: the
 * regression catch the umbrella's spec-vs-truth chain depends on.
 *
 *   pnpm exec vite-node src/archetypes/producer/balance/verify.ts
 */

import { Decimal, runUntil, type Engine } from 'open-loop-engine';
import { createProducerEngine, getBuildings, getPrimaryResource, getUpgrades } from '..';
import { PRODUCER_BALANCE } from '..';
import { arcWaypoints, strictTierOrderSchedule, type ArcWaypoint, type ScheduleStep } from './spec';

const PER_TIER_COUNT = Number(PRODUCER_BALANCE.milestoneThresholds[2] ?? 25);
const TOLERANCE_PCT = 0.05;
const BUDGET_SEC = 90 * 60 * 3; // generous budget — same scale as run.ts

let engineCounter = 0;

function buildVerifyEngine(): Engine {
  const { engine } = createProducerEngine(undefined, {
    persistenceNamespace: `verify-${++engineCounter}`,
  });
  engine.selectMod('bakery');
  engine.start();
  engine.stop();
  return engine;
}

/**
 * Replay the schedule under sim. For each step:
 *   1. `runUntil(primary >= cost)` — let production accumulate.
 *   2. Apply step manually: decrement primary, increment count or activate
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
  const buildings = getBuildings();
  const upgrades = getUpgrades();
  const primary = getPrimaryResource();

  // Reset state.
  for (const entry of buildings.getAll()) {
    if (entry.def.trigger !== 'continuous' || !entry.producer.repeatable) continue;
    entry.producer.repeatable.amount.value = initial[entry.def.id] ?? 0;
  }
  for (const entry of upgrades.getAll()) {
    if (entry.purchasable.active.value) entry.purchasable.amount.value = 0;
  }
  primary.value = 0;

  const out: ArcWaypoint[] = [];
  let cumulativeSec = 0;

  for (const step of schedule) {
    if (step.kind === 'tier') {
      const p = buildings.getProducer(step.id);
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
          until: () => Decimal.gte(primary.value, cost),
          maxSimTime: remaining,
          tickDelta: 1,
        });
        if (result.terminated !== 'predicate') {
          throw new Error(
            `verify: unaffordable cost ${cost} for '${step.id}' at sim-time ${cumulativeSec + result.elapsedSimulated}s`,
          );
        }
        cumulativeSec += result.elapsedSimulated;
        primary.value = Decimal.sub(primary.value, cost);
        p.repeatable.amount.value = k + 1;
      }
      out.push({ step, atSec: cumulativeSec, counts: snapshotCounts() });
    } else {
      const u = upgrades.getPurchasable(step.id);
      if (!u) throw new Error(`verify: no upgrade '${step.id}'`);
      if (!u.active.value) {
        const cost = Decimal.fromValue(u.getCost(1)).toNumber();
        const remaining = BUDGET_SEC - cumulativeSec;
        const result = runUntil({
          engine,
          until: () => Decimal.gte(primary.value, cost),
          maxSimTime: remaining,
          tickDelta: 1,
        });
        if (result.terminated !== 'predicate') {
          throw new Error(
            `verify: unaffordable upgrade '${step.id}' at sim-time ${cumulativeSec + result.elapsedSimulated}s`,
          );
        }
        cumulativeSec += result.elapsedSimulated;
        primary.value = Decimal.sub(primary.value, cost);
        u.amount.value = 1;
      }
      out.push({ step, atSec: cumulativeSec, counts: snapshotCounts() });
    }
  }
  return out;
}

function snapshotCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of getBuildings().getAll()) {
    if (entry.def.trigger !== 'continuous') continue;
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

// TODO(expansion): diffTrajectories<TWaypoint>({ predicted, simulated, keys, tolerance })
// — per-waypoint trajectory diff for methodology-#2 sim-verify, candidate at
// open-loop-engine/docs/candidate-primitives.md. Graduate at N=2.
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

  console.log('# Producer sim-verify — methodology #2 verification\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log(
    'Predictor (closed-form via spec.ts arcWaypoints) vs sim (runUntil per step). Same schedule, two execution paths.',
  );
  console.log(`Tolerance: ${(TOLERANCE_PCT * 100).toFixed(1)}% per-waypoint.\n`);

  const schedule = strictTierOrderSchedule({ perTierCount: PER_TIER_COUNT });
  const initial: Record<string, number> = { cursor: 1 };

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
      'Predictor and sim disagree under same schedule. The algebra is unchanged; an engine-side getCost/getTotalRate primitive may have drifted. Investigate per-waypoint.',
    );
    process.exitCode = 1;
  } else {
    console.log(`All ${rows.length} waypoints within tolerance. Predictor agrees with sim.`);
  }

  console.log(`\n(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
