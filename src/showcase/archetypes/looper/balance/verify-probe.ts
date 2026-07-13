/**
 * Looper verify-driver — trajectory waypoint diff for solver-driven balance.
 *
 * Replays REACH_FOREST_1's A\* trajectory at canonical settings end-to-end
 * through `buildLooperSimEngine`, snapshotting cross-loop state at each
 * decision-point step boundary, and diffs against a checked-in
 * `GOLDEN_WAYPOINTS` array with per-field tolerance.
 *
 * Per `archetypes/BALANCING-looper.md § Lock semantics — trajectory
 * waypoints + feasibility frontier`. The regression catches: engine-side
 * primitive drift in `computeAdjustedTicks` / `addStatXP` / mana drain /
 * reward-effect handlers; bot or solver changes that perturb the chosen
 * queue or the per-step state arrival.
 *
 * Distinct from producer's `verify-probe.ts` (which diffs a closed-form
 * predictor against the sim) because looper has no closed-form predictor —
 * the solver's chosen trajectory IS the canonical reference. What's
 * regression-caught here is the consistency of "same canonical settings →
 * same trajectory → same per-step state arrival."
 *
 *   pnpm exec vite-node src/showcase/archetypes/looper/balance/verify-probe.ts
 *   pnpm exec vite-node src/showcase/archetypes/looper/balance/verify-probe.ts --bless
 *
 * `--bless` mode prints the captured waypoints as the new golden array
 * (paste into this file's `GOLDEN_WAYPOINTS` block). Use when intentional
 * trajectory drift lands; never blanket-bless to silence a failure.
 */

import { runUntil, type Engine } from '@open-loop/engine';
import { getLoopCount, getProgressLevel, getRegularGood, getTalentLevel } from '../modules';
import { STATS } from '../data/stats';
import { BalanceBotControlKey, buildLooperSimEngine, type LoopQueue } from './bot';
import { REACH_FOREST_1 } from './goals';
import { astar, detectBracketTrigger, snapshotState, type SearchProblem } from './solver';

// ─── Tunables ────────────────────────────────────────────────────────────

const INITIAL_QUEUE: LoopQueue = [{ actionId: 'wander', repeats: 1 }];
const TICK_DELTA = 0.5; // see solve.ts header for the GCD argument
const PER_ROLLOUT_BUDGET_SEC = 5 * 60;
const SIM_TIME_TOLERANCE_PCT = 0.05;
const STAT_IDS = STATS.map((s) => s.id);

// ─── Waypoint shape ──────────────────────────────────────────────────────

interface Waypoint {
  stepIndex: number;
  queue: LoopQueue;
  cumulativeSimSec: number;
  wander: number;
  forest: number;
  met: number;
  shortcut: number;
  loopCount: number;
  potsGood: number;
  locksGood: number;
  talentLevels: Record<string, number>;
  rolloutTermination: 'bracket' | 'goal' | 'budget';
}

function captureWaypoint(
  stepIndex: number,
  queue: LoopQueue,
  cumulativeSimSec: number,
  rolloutTermination: 'bracket' | 'goal' | 'budget',
): Waypoint {
  const talentLevels: Record<string, number> = {};
  for (const id of STAT_IDS) talentLevels[id] = Number(getTalentLevel(id));
  return {
    stepIndex,
    queue: queue.map((it) => ({ actionId: it.actionId, repeats: it.repeats })),
    cumulativeSimSec,
    wander: getProgressLevel('wander'),
    forest: getProgressLevel('forest'),
    met: getProgressLevel('met'),
    shortcut: getProgressLevel('shortcut'),
    loopCount: getLoopCount().value,
    potsGood: getRegularGood('pots'),
    locksGood: getRegularGood('locks'),
    talentLevels,
    rolloutTermination,
  };
}

// ─── Trajectory replay ───────────────────────────────────────────────────

/**
 * Replay each queue in the trajectory through the engine, snapshotting at
 * each step boundary. Uses the same bracket-or-goal terminator as solver
 * rollouts (`detectBracketTrigger` + `evaluateGoal`), so step boundaries
 * line up 1:1 with the solver's `SearchNode` chain.
 */
function replayTrajectory(
  engine: Engine,
  initialBlob: string,
  trajectory: LoopQueue[],
): Waypoint[] {
  const control = engine.tryInject(BalanceBotControlKey);
  if (!control) throw new Error('verify: BalanceBotControlKey not provided');

  const importResult = engine.saveManager!.importSave(initialBlob);
  if (!importResult.success) throw new Error('verify: importSave failed');

  const out: Waypoint[] = [];
  let cumulative = 0;

  for (let i = 0; i < trajectory.length; i++) {
    const queue = trajectory[i]!;
    control.setSchedule([queue]);
    const stateAtStart = snapshotState();
    let goalReached = false;
    let termination: 'bracket' | 'goal' | 'budget' = 'budget';

    const remaining = REACH_FOREST_1.budgetSec - cumulative;
    const cap = Math.min(PER_ROLLOUT_BUDGET_SEC, Math.max(0, remaining));

    const result = runUntil({
      engine,
      until: () => {
        if (getProgressLevel('forest') >= 1) {
          goalReached = true;
          termination = 'goal';
          return true;
        }
        if (detectBracketTrigger(stateAtStart) !== null) {
          termination = 'bracket';
          return true;
        }
        return false;
      },
      maxSimTime: cap,
      tickDelta: TICK_DELTA,
    });

    if (!goalReached && result.terminated !== 'predicate') termination = 'budget';
    cumulative += result.elapsedSimulated;
    out.push(captureWaypoint(i, queue, cumulative, termination));
  }

  return out;
}

// ─── Golden waypoints ────────────────────────────────────────────────────
//
// Bless on first run via `--bless` to populate. Subsequent runs diff
// against this array; nonzero exit on any tolerance breach.

const GOLDEN_WAYPOINTS: Waypoint[] = [
  {
    stepIndex: 0,
    queue: [{ actionId: 'wander', repeats: 1 }],
    cumulativeSimSec: 37.5,
    wander: 3,
    forest: 0,
    met: 0,
    shortcut: 0,
    loopCount: 2,
    potsGood: 0,
    locksGood: 0,
    talentLevels: { Dex: 0, Str: 0, Con: 0, Spd: 0, Per: 0, Cha: 0, Int: 0, Luck: 0, Soul: 0 },
    rolloutTermination: 'bracket',
  },
  {
    stepIndex: 1,
    queue: [{ actionId: 'wander', repeats: 1 }],
    cumulativeSimSec: 100,
    wander: 5,
    forest: 0,
    met: 0,
    shortcut: 0,
    loopCount: 7,
    potsGood: 0,
    locksGood: 0,
    talentLevels: { Dex: 0, Str: 0, Con: 0, Spd: 0, Per: 0, Cha: 0, Int: 0, Luck: 0, Soul: 0 },
    rolloutTermination: 'bracket',
  },
  {
    stepIndex: 2,
    queue: [{ actionId: 'smash-pots', repeats: 50 }],
    cumulativeSimSec: 125,
    wander: 5,
    forest: 0,
    met: 0,
    shortcut: 0,
    loopCount: 9,
    potsGood: 1,
    locksGood: 0,
    talentLevels: { Dex: 0, Str: 0, Con: 0, Spd: 0, Per: 0, Cha: 0, Int: 0, Luck: 0, Soul: 0 },
    rolloutTermination: 'bracket',
  },
  {
    stepIndex: 3,
    queue: [
      { actionId: 'smash-pots', repeats: 3 },
      { actionId: 'wander', repeats: 1 },
    ],
    cumulativeSimSec: 395,
    wander: 8,
    forest: 0,
    met: 0,
    shortcut: 0,
    loopCount: 23,
    potsGood: 3,
    locksGood: 0,
    talentLevels: { Dex: 0, Str: 0, Con: 0, Spd: 0, Per: 0, Cha: 0, Int: 0, Luck: 0, Soul: 0 },
    rolloutTermination: 'bracket',
  },
  {
    stepIndex: 4,
    queue: [
      { actionId: 'smash-pots', repeats: 3 },
      { actionId: 'explore-forest', repeats: 1 },
    ],
    cumulativeSimSec: 442.5,
    wander: 8,
    forest: 1,
    met: 0,
    shortcut: 0,
    loopCount: 24,
    potsGood: 3,
    locksGood: 0,
    talentLevels: { Dex: 0, Str: 0, Con: 0, Spd: 0, Per: 0, Cha: 0, Int: 0, Luck: 0, Soul: 0 },
    rolloutTermination: 'goal',
  },
];

// ─── Diff ────────────────────────────────────────────────────────────────

interface DiffIssue {
  stepIndex: number;
  field: string;
  expected: unknown;
  actual: unknown;
  detail: string;
}

function queuesEqual(a: LoopQueue, b: LoopQueue): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.actionId !== b[i]!.actionId) return false;
    if (a[i]!.repeats !== b[i]!.repeats) return false;
  }
  return true;
}

function diff(actual: Waypoint[], golden: Waypoint[]): DiffIssue[] {
  const issues: DiffIssue[] = [];

  if (actual.length !== golden.length) {
    issues.push({
      stepIndex: -1,
      field: 'trajectory-length',
      expected: golden.length,
      actual: actual.length,
      detail: 'trajectory step count changed',
    });
    return issues;
  }

  for (let i = 0; i < actual.length; i++) {
    const a = actual[i]!;
    const g = golden[i]!;

    if (!queuesEqual(a.queue, g.queue)) {
      issues.push({
        stepIndex: i,
        field: 'queue',
        expected: g.queue,
        actual: a.queue,
        detail: 'queue shape drift (exact match required)',
      });
    }

    if (a.rolloutTermination !== g.rolloutTermination) {
      issues.push({
        stepIndex: i,
        field: 'rolloutTermination',
        expected: g.rolloutTermination,
        actual: a.rolloutTermination,
        detail: 'step termination reason changed',
      });
    }

    const deltaPct =
      g.cumulativeSimSec > 0
        ? Math.abs(a.cumulativeSimSec - g.cumulativeSimSec) / g.cumulativeSimSec
        : a.cumulativeSimSec === 0
          ? 0
          : Infinity;
    if (deltaPct > SIM_TIME_TOLERANCE_PCT) {
      issues.push({
        stepIndex: i,
        field: 'cumulativeSimSec',
        expected: g.cumulativeSimSec,
        actual: a.cumulativeSimSec,
        detail: `±${(SIM_TIME_TOLERANCE_PCT * 100).toFixed(0)}% relative, observed ${(deltaPct * 100).toFixed(2)}%`,
      });
    }

    for (const k of [
      'wander',
      'forest',
      'met',
      'shortcut',
      'loopCount',
      'potsGood',
      'locksGood',
    ] as const) {
      if (a[k] !== g[k]) {
        issues.push({
          stepIndex: i,
          field: k,
          expected: g[k],
          actual: a[k],
          detail: 'integer state field (exact match required)',
        });
      }
    }

    for (const id of STAT_IDS) {
      if ((a.talentLevels[id] ?? 0) !== (g.talentLevels[id] ?? 0)) {
        issues.push({
          stepIndex: i,
          field: `talent[${id}]`,
          expected: g.talentLevels[id] ?? 0,
          actual: a.talentLevels[id] ?? 0,
          detail: 'integer talent level (exact match required)',
        });
      }
    }
  }

  return issues;
}

// ─── Rendering ───────────────────────────────────────────────────────────

function fmtQueue(q: LoopQueue): string {
  if (q.length === 0) return '[]';
  return '[' + q.map((it) => `${it.actionId}×${it.repeats}`).join(', ') + ']';
}

function fmtSimTime(sec: number): string {
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`;
}

function renderWaypoints(waypoints: Waypoint[]): string {
  const lines: string[] = [];
  for (const w of waypoints) {
    lines.push(
      `  step ${w.stepIndex}: ${fmtQueue(w.queue)}  @ ${fmtSimTime(w.cumulativeSimSec)}  (${w.rolloutTermination})`,
    );
    lines.push(
      `    wander=${w.wander} forest=${w.forest} met=${w.met} shortcut=${w.shortcut}  loops=${w.loopCount}  potsGood=${w.potsGood} locksGood=${w.locksGood}`,
    );
    const talents = STAT_IDS.map((id) => `${id}=${w.talentLevels[id] ?? 0}`).join(' ');
    lines.push(`    talents: ${talents}`);
  }
  return lines.join('\n');
}

// ─── Bless mode ──────────────────────────────────────────────────────────

function renderBless(waypoints: Waypoint[]): string {
  return 'const GOLDEN_WAYPOINTS: Waypoint[] = ' + JSON.stringify(waypoints, null, 2) + ';\n';
}

// ─── Main ────────────────────────────────────────────────────────────────

function main(): void {
  const bless = process.argv.includes('--bless');
  const t0 = Date.now();

  console.log('# Looper verify — REACH_FOREST_1 trajectory waypoint diff\n');
  console.log(`Run at ${new Date().toISOString()}\n`);

  const engine = buildLooperSimEngine();
  const initialBlob = engine.saveManager!.exportSave();

  const problem: SearchProblem = {
    engine,
    initialBlob,
    goal: REACH_FOREST_1,
    initialQueue: INITIAL_QUEUE,
    perRolloutBudget: PER_ROLLOUT_BUDGET_SEC,
    totalBudget: REACH_FOREST_1.budgetSec,
    maxNodes: 500,
    maxWallMs: 30_000,
    tickDelta: TICK_DELTA,
  };

  console.log('## Searching canonical A* trajectory...');
  const search = astar(problem);
  if (!search.found) {
    console.log(`\nA* did not find REACH_FOREST_1 within budget (${search.termination}).`);
    console.log('Engine drift or solver regression — investigate before blessing.');
    process.exitCode = 1;
    return;
  }
  console.log(
    `Found in ${search.wallTimeMs}ms — ${search.trajectory.length} steps, sim-time ${fmtSimTime(search.totalSimTime)}.\n`,
  );

  console.log('## Replaying trajectory to capture per-step waypoints...');
  const captured = replayTrajectory(engine, initialBlob, search.trajectory);
  console.log(renderWaypoints(captured));
  console.log();

  if (bless) {
    console.log('## --bless: paste the following into GOLDEN_WAYPOINTS\n');
    console.log(renderBless(captured));
    console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    return;
  }

  if (GOLDEN_WAYPOINTS.length === 0) {
    console.log('## GOLDEN_WAYPOINTS is empty — re-run with --bless to lock initial values.\n');
    console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    process.exitCode = 1;
    return;
  }

  const issues = diff(captured, GOLDEN_WAYPOINTS);
  if (issues.length === 0) {
    console.log(`## All ${captured.length} waypoints within tolerance.`);
  } else {
    console.log(`## Tolerance breach: ${issues.length} issue(s).\n`);
    for (const i of issues) {
      const where = i.stepIndex === -1 ? 'trajectory' : `step ${i.stepIndex}`;
      console.log(
        `  ${where}  ${i.field}  expected=${JSON.stringify(i.expected)}  actual=${JSON.stringify(i.actual)}  (${i.detail})`,
      );
    }
    process.exitCode = 1;
  }

  console.log(`\n(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
