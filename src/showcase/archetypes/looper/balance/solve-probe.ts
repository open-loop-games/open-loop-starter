/**
 * Looper balance solver — perturbation sweep over `LooperTunableKey`.
 *
 * Per `archetypes/BALANCING-looper.md § Feasibility frontier`: drives the
 * tunable surface around canonical settings and reports per-cell
 * reachability + sim-time-at-goal for REACH_FOREST_1.
 *
 *   pnpm exec vite-node src/showcase/archetypes/looper/balance/solve-probe.ts
 *   pnpm exec vite-node src/showcase/archetypes/looper/balance/solve-probe.ts --bless
 *
 * `--bless` mode prints the captured frontier table as the new golden.
 *
 * Scoped to one axis this leaf:
 *
 *   - `balance/costDivisor` — live closure read at `action-runner.ts:486`;
 *     mid-run pushScope propagates immediately. Affects stat-level cost
 *     reduction; bounded effect on REACH_FOREST_1 because the canonical
 *     trajectory rides progress + regular actions and the within-loop XP
 *     compression is small at zero starting stats per PROGRESSION.md
 *     § Adjusted-ticks. Still in the sweep as the only LooperTunableKey
 *     that nontrivially exercises the goal trajectory.
 *
 * Axes deferred for this leaf:
 *
 *   - `balance/initialMana` — reader is captured at module install
 *     (`mana.ts:122`), and the module-singleton finding blocks rebuilding
 *     the engine per cell. Resolves when action-types module-singleton
 *     state moves into per-engine context.
 *   - `balance/talentAccrualRatio` — talent compounding doesn't bite the
 *     first-arc trajectory; per PROGRESSION.md § XP accrual the canonical
 *     `talentAccrualRatio = 0.01` keeps talent levels at zero for the
 *     ~24 loops of REACH_FOREST_1 (talent becomes load-bearing at
 *     hundreds-to-thousands of loops). Joins the sweep when
 *     STAT_TIER_COMPOUND's decision-point + operator menus land.
 */

import type { Engine, TuningRegistry } from '@open-loop/engine';
import { LooperTuningRegistryKey, type LooperTunableKey } from '../modules';
import { BalanceBotControlKey, buildLooperSimEngine, type LoopQueue } from './bot';
import { REACH_FOREST_1 } from './goals';
import { astar, type SearchProblem } from './solver';

// ─── Sweep grid ──────────────────────────────────────────────────────────

const TICK_DELTA = 0.5;
const PER_ROLLOUT_BUDGET_SEC = 5 * 60;
const SEARCH_MAX_NODES = 500;
const SEARCH_MAX_WALL_MS = 30_000;
const INITIAL_QUEUE: LoopQueue = [{ actionId: 'wander', repeats: 1 }];

const SIM_TIME_TOLERANCE_PCT = 0.1;

interface AxisCell {
  axis: LooperTunableKey;
  value: number;
  factor: number;
  isCanonical: boolean;
}

// Cells default to the canonical-only smoke test. Real perturbation grids
// land per-fork: a fork that twists `costDivisor` (or any LooperTunableKey)
// adds cells with their bounds, in their own copy of this file. The harness
// is the deliverable; the grid is fork-specific design content.
const SWEEP_CELLS: AxisCell[] = [
  { axis: 'balance/costDivisor', factor: 1.0, value: 100, isCanonical: true },
];

// ─── Per-cell result ─────────────────────────────────────────────────────

interface FrontierCell {
  axis: LooperTunableKey;
  factor: number;
  value: number;
  reachable: boolean;
  simTimeAtGoal: number | null;
  trajectoryLength: number | null;
  terminationReason: string;
  nodesExpanded: number;
}

function makeProblem(engine: Engine, initialBlob: string): SearchProblem {
  return {
    engine,
    initialBlob,
    goal: REACH_FOREST_1,
    initialQueue: INITIAL_QUEUE,
    perRolloutBudget: PER_ROLLOUT_BUDGET_SEC,
    totalBudget: REACH_FOREST_1.budgetSec,
    maxNodes: SEARCH_MAX_NODES,
    maxWallMs: SEARCH_MAX_WALL_MS,
    tickDelta: TICK_DELTA,
  };
}

function runCell(
  engine: Engine,
  initialBlob: string,
  registry: TuningRegistry,
  cell: AxisCell,
): FrontierCell {
  // astar's rootNode does importSave(initialBlob) internally — no need
  // to pre-import here. Scope must be pushed before astar so the rollout
  // reads the perturbed values.
  const cleanup = registry.pushScope(`solve:${cell.axis}=${cell.value}`, {
    [cell.axis]: () => cell.value,
  });

  let result;
  try {
    result = astar(makeProblem(engine, initialBlob));
  } finally {
    cleanup();
  }
  if (registry.scopeDepth !== 0) {
    throw new Error(`scope leak after ${cell.axis}=${cell.value}: depth=${registry.scopeDepth}`);
  }

  return {
    axis: cell.axis,
    factor: cell.factor,
    value: cell.value,
    reachable: result.found,
    simTimeAtGoal: result.found ? result.totalSimTime : null,
    trajectoryLength: result.found ? result.trajectory.length : null,
    terminationReason: result.termination,
    nodesExpanded: result.nodesExpanded,
  };
}

// ─── Golden frontier ─────────────────────────────────────────────────────
//
// No baked-in golden frontier. Forks bless their own when they have real
// perturbations to lock: arbitrary multipliers around canonical have no
// design basis and would confabulate a baseline future sessions then have
// to honor. The trajectory-waypoint lock in `verify.ts` is the canonical-
// trajectory regression catch this leaf ships.
const GOLDEN_FRONTIER: FrontierCell[] = [];

// ─── Diff ────────────────────────────────────────────────────────────────

interface FrontierIssue {
  cellKey: string;
  field: string;
  expected: unknown;
  actual: unknown;
  detail: string;
}

function cellKey(c: { axis: string; value: number }): string {
  return `${c.axis}=${c.value}`;
}

function diffFrontier(actual: FrontierCell[], golden: FrontierCell[]): FrontierIssue[] {
  const issues: FrontierIssue[] = [];
  const byKey = new Map(golden.map((g) => [cellKey(g), g]));

  if (actual.length !== golden.length) {
    issues.push({
      cellKey: '-',
      field: 'cell-count',
      expected: golden.length,
      actual: actual.length,
      detail: 'sweep cell count changed',
    });
  }

  for (const a of actual) {
    const key = cellKey(a);
    const g = byKey.get(key);
    if (!g) {
      issues.push({
        cellKey: key,
        field: 'present',
        expected: false,
        actual: true,
        detail: 'cell present in current run but absent from golden',
      });
      continue;
    }
    if (a.reachable !== g.reachable) {
      issues.push({
        cellKey: key,
        field: 'reachable',
        expected: g.reachable,
        actual: a.reachable,
        detail: 'reachability flipped',
      });
    }
    if (a.terminationReason !== g.terminationReason) {
      issues.push({
        cellKey: key,
        field: 'terminationReason',
        expected: g.terminationReason,
        actual: a.terminationReason,
        detail: 'termination reason changed',
      });
    }
    if (a.reachable && g.reachable) {
      if (a.trajectoryLength !== g.trajectoryLength) {
        issues.push({
          cellKey: key,
          field: 'trajectoryLength',
          expected: g.trajectoryLength,
          actual: a.trajectoryLength,
          detail: 'trajectory length drift (exact match required for reachable cells)',
        });
      }
      const gSim = g.simTimeAtGoal ?? 0;
      const aSim = a.simTimeAtGoal ?? 0;
      const deltaPct = gSim > 0 ? Math.abs(aSim - gSim) / gSim : 0;
      if (deltaPct > SIM_TIME_TOLERANCE_PCT) {
        issues.push({
          cellKey: key,
          field: 'simTimeAtGoal',
          expected: gSim,
          actual: aSim,
          detail: `±${(SIM_TIME_TOLERANCE_PCT * 100).toFixed(0)}% relative, observed ${(deltaPct * 100).toFixed(2)}%`,
        });
      }
    }
  }

  for (const g of golden) {
    if (!actual.find((a) => cellKey(a) === cellKey(g))) {
      issues.push({
        cellKey: cellKey(g),
        field: 'present',
        expected: true,
        actual: false,
        detail: 'cell in golden missing from current run',
      });
    }
  }

  return issues;
}

// ─── Rendering ───────────────────────────────────────────────────────────

function fmtSimTime(sec: number | null): string {
  if (sec === null || !isFinite(sec)) return '—';
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`;
}

function renderTable(rows: FrontierCell[]): string {
  const header = [
    'axis',
    'factor',
    'value',
    'reachable',
    'simTime',
    'steps',
    'termination',
    'nodes',
  ];
  const data = rows.map((r) => [
    r.axis.replace('balance/', ''),
    `${r.factor}×`,
    String(r.value),
    r.reachable ? 'yes' : 'NO',
    fmtSimTime(r.simTimeAtGoal),
    r.trajectoryLength === null ? '—' : String(r.trajectoryLength),
    r.terminationReason,
    String(r.nodesExpanded),
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...data.map((d) => d[i]!.length)));
  const row = (cells: string[]) => `| ${cells.map((c, i) => c.padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...data.map(row)].join('\n');
}

function renderBless(rows: FrontierCell[]): string {
  return 'const GOLDEN_FRONTIER: FrontierCell[] = ' + JSON.stringify(rows, null, 2) + ';\n';
}

// ─── Main ────────────────────────────────────────────────────────────────

function main(): void {
  const bless = process.argv.includes('--bless');
  const t0 = Date.now();

  console.log('# Looper balance solve — REACH_FOREST_1 perturbation sweep\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log(
    `${SWEEP_CELLS.length} cells across ${new Set(SWEEP_CELLS.map((c) => c.axis)).size} axes (one-at-a-time).\n`,
  );

  const engine = buildLooperSimEngine();
  const registry = engine.tryInject(LooperTuningRegistryKey)!;
  const initialBlob = engine.saveManager!.exportSave();

  // Confirm bot control surface is wired before iterating cells.
  if (!engine.tryInject(BalanceBotControlKey)) {
    throw new Error('solve: BalanceBotControlKey not provided by buildLooperSimEngine');
  }

  const results: FrontierCell[] = [];
  for (const cell of SWEEP_CELLS) {
    const cellT0 = Date.now();
    const res = runCell(engine, initialBlob, registry, cell);
    results.push(res);
    console.log(
      `  ${cell.axis.replace('balance/', '').padEnd(20)} ${`${cell.factor}×`.padEnd(6)} value=${String(cell.value).padEnd(6)} reachable=${res.reachable ? 'yes' : 'NO '} simTime=${fmtSimTime(res.simTimeAtGoal)}  (${Date.now() - cellT0}ms)`,
    );
  }

  console.log('\n## Frontier\n');
  console.log(renderTable(results));
  console.log();

  if (bless) {
    console.log('## --bless: paste the following into GOLDEN_FRONTIER\n');
    console.log(renderBless(results));
    console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    return;
  }

  if (GOLDEN_FRONTIER.length === 0) {
    console.log('## No golden frontier locked.');
    console.log(
      'Forks: add cells to SWEEP_CELLS, run `--bless`, paste into GOLDEN_FRONTIER to enable drift detection.',
    );
    console.log(`\n(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    return;
  }

  const issues = diffFrontier(results, GOLDEN_FRONTIER);
  if (issues.length === 0) {
    console.log(`## All ${results.length} cells within tolerance.`);
  } else {
    console.log(`## Frontier drift: ${issues.length} issue(s).\n`);
    for (const i of issues) {
      console.log(
        `  ${i.cellKey}  ${i.field}  expected=${JSON.stringify(i.expected)}  actual=${JSON.stringify(i.actual)}  (${i.detail})`,
      );
    }
    process.exitCode = 1;
  }

  console.log(`\n(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
