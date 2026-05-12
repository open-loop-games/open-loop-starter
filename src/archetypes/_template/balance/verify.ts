/**
 * <Archetype> sim-verify driver — methodology #2 verify half + #1↔#2 bridge.
 *
 * Verification half of methodology #2. Walks the bot's actual purchase
 * sequence under sim, runs the predictor (`./predict.ts`) over the same
 * sequence, diffs per-waypoint with tolerance. The diff is the regression
 * catch for engine-side `getCost`/`getTotalRate` drift — when predictor
 * and sim disagree, the algebra didn't change but an engine primitive's
 * answer did.
 *
 * Per `archetypes/BALANCING.md § Theme 3 #2` and `§ Engine as oracle`. The
 * `#1↔#2 Bridge` section explains how this verify-driver is the link
 * between methodology #1's bisection and methodology #2's prediction:
 * predictor walks the bot's policy in closed-form, sim integrates the same
 * policy in ticks, the diff confirms they agree.
 *
 * For methodology-#1-only archetypes (ambient): delete this file on copy.
 *
 * Invoke as a vite-node script:
 *   `pnpm exec vite-node src/archetypes/<archetype>/balance/verify.ts`
 */

import { runUntil, type Engine } from 'open-loop-engine';
import { arcWaypoints, type ArcWaypoint, type ScheduleStep } from './spec';
import { buildSimEngine } from './bot';

const TOLERANCE_PCT = 0.05; // 5% per-waypoint tolerance default

interface DiffRow {
  step: ScheduleStep;
  predictedSec: number;
  simulatedSec: number;
  deltaSec: number;
  deltaPct: number;
  withinTolerance: boolean;
}

/**
 * Extract the bot's actual purchase sequence under sim. The schedule is
 * built from the bot's per-tick decisions, not from a strict-tier-order
 * default — it's what the bot *actually* did.
 *
 * TODO(fill-in): hook into the bot's purchase events (or replay from a
 * sim run with event-driven probes). For triangular row: each purchase or
 * activation becomes one ScheduleStep entry, in firing order. The
 * `runProbe({mode: 'event'})` harness mode (`open-loop-engine § harness`) is
 * one path; the other is direct subscription to the bot's purchase calls.
 */
function extractBotSchedule(_engine: Engine): ScheduleStep[] {
  // TODO(fill-in): record bot's actual purchase sequence during a sim run.
  throw new Error('template — replace with archetype-specific bot-trace extraction');
}

/**
 * Run the bot under sim until completion (or budget exhaustion); return a
 * per-step trajectory of cumulative sim-time at each purchase event.
 */
function simulateBotTrajectory(_engine: Engine, _maxSimTime: number): ArcWaypoint[] {
  // TODO(fill-in): drive the engine via runUntil with an event-driven
  // probe that records cumulative sim-time at each purchase event. The
  // returned waypoints match `predict.ts`'s shape so per-waypoint diff is
  // index-aligned.
  throw new Error('template — replace with archetype-specific sim trajectory recorder');
}

function diffTrajectories(
  predicted: readonly ArcWaypoint[],
  simulated: readonly ArcWaypoint[],
): DiffRow[] {
  const rows: DiffRow[] = [];
  const n = Math.min(predicted.length, simulated.length);
  for (let i = 0; i < n; i++) {
    const p = predicted[i]!;
    const s = simulated[i]!;
    const deltaSec = s.atSec - p.atSec;
    const deltaPct = p.atSec > 0 ? Math.abs(deltaSec) / p.atSec : 0;
    rows.push({
      step: p.step,
      predictedSec: p.atSec,
      simulatedSec: s.atSec,
      deltaSec,
      deltaPct,
      withinTolerance: deltaPct <= TOLERANCE_PCT,
    });
  }
  if (predicted.length !== simulated.length) {
    console.warn(
      `verify: trajectory-length mismatch — predicted=${predicted.length} simulated=${simulated.length}`,
    );
  }
  return rows;
}

function fmt(sec: number): string {
  if (!isFinite(sec)) return '∞';
  if (sec < 1) return `${sec.toFixed(2)}s`;
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`;
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

  console.log('# <Archetype> sim-verify — methodology #2 verification\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log(
    'Predictor (closed-form, engine-as-oracle) vs simulated trajectory under bot policy.',
  );
  console.log(`Tolerance: ${(TOLERANCE_PCT * 100).toFixed(1)}% per-waypoint.\n`);

  const engine = buildSimEngine();
  const schedule = extractBotSchedule(engine);
  const predicted = arcWaypoints(schedule);
  const simulated = simulateBotTrajectory(engine, Number.POSITIVE_INFINITY);
  const rows = diffTrajectories(predicted, simulated);

  console.log(
    renderTable(
      ['#', 'step', 'predicted', 'simulated', 'Δ', 'Δ%', 'pass'],
      rows.map((r, i) => [
        String(i + 1),
        JSON.stringify(r.step),
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
      'Predictor and sim disagree. The algebra is unchanged; an engine-side getCost/getTotalRate primitive may have drifted. Investigate per-waypoint.',
    );
    process.exitCode = 1;
  } else {
    console.log(`All ${rows.length} waypoints within tolerance. Predictor agrees with sim.`);
  }

  console.log(`\n(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  void runUntil; // imported for archetype-specific verify code; reference here keeps import warning quiet.
}

main();
