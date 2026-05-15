/**
 * Looper balance — algorithm comparison (archived discovery artifact).
 *
 * Run: `pnpm exec vite-node src/archetypes/looper/balance/algorithm-comparison.ts`.
 *
 * Verdict landed in `archetypes/BALANCING-looper.md § Algorithm choice` —
 * A\*(h=0) primary, beam(W=8) fallback at REACH_FOREST_1's scale. This
 * script remains the regenerator for that verdict table; rerun when the
 * solver shape changes to confirm the comparison still holds, or when
 * STAT_TIER_COMPOUND / WANDER_TIME_BOUND get their own decision-point +
 * operator menus and re-test the verdict.
 *
 * Scope is REACH_FOREST_1 only at canonical settings (initialMana=250,
 * costDivisor=100, talentAccrualRatio=0.01). The perturbation sweep
 * lives in `solve.ts`.
 */

import type { Engine } from '@open-loop/engine';
import { astar, beam, type SearchResult, type SearchProblem } from './solver';
import { buildLooperSimEngine, type LoopQueue } from './bot';
import { REACH_FOREST_1 } from './goals';

const INITIAL_QUEUE: LoopQueue = [{ actionId: 'wander', repeats: 1 }];

const SEARCH_BUDGET_WALLMS = 30_000;
const SEARCH_BUDGET_NODES = 500;
const PER_ROLLOUT_BUDGET_SEC = 5 * 60;
// tickDelta must divide every action's manaCost evenly given tickRate=20:
// per-tick drain = tickRate × tickDelta. Smash Pots costs 50 mana, so the
// per-tick grid must divide 50. tickDelta=1 (default sibling-solver value)
// gives 20-mana ticks → smash overshoots to 60 effective cost, breaking the
// banking math. tickDelta=0.5 gives 10-mana ticks: smash exactly 50, Explore
// Forest exactly 400.
const TICK_DELTA = 0.5;

function makeProblem(engine: Engine, initialBlob: string): SearchProblem {
  return {
    engine,
    initialBlob,
    goal: REACH_FOREST_1,
    initialQueue: INITIAL_QUEUE,
    perRolloutBudget: PER_ROLLOUT_BUDGET_SEC,
    totalBudget: REACH_FOREST_1.budgetSec,
    maxNodes: SEARCH_BUDGET_NODES,
    maxWallMs: SEARCH_BUDGET_WALLMS,
    tickDelta: TICK_DELTA,
  };
}

function fmtSimTime(sec: number): string {
  if (!isFinite(sec)) return '∞';
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`;
}

function fmtQueue(q: LoopQueue): string {
  if (q.length === 0) return '[]';
  return '[' + q.map((it) => `${it.actionId}×${it.repeats}`).join(', ') + ']';
}

function fmtTrajectory(traj: LoopQueue[]): string {
  return traj.map((q, i) => `  step ${i}: ${fmtQueue(q)}`).join('\n');
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

function describe(name: string, result: SearchResult): string[] {
  return [
    name,
    result.found ? 'yes' : 'no',
    fmtSimTime(result.totalSimTime),
    String(result.nodesExpanded),
    String(result.nodesGenerated),
    `${result.wallTimeMs}ms`,
    result.termination,
  ];
}

function main(): void {
  const t0 = Date.now();
  console.log('# Looper balance solver prototype — REACH_FOREST_1');
  console.log(`Run at ${new Date().toISOString()}`);
  console.log('');
  console.log('Decision-point branching search over the queue mutation timeline.');
  console.log(`Goal: forest ≥ 1. Budget: ${fmtSimTime(REACH_FOREST_1.budgetSec)} sim-time.`);
  console.log(`Search caps: ${SEARCH_BUDGET_NODES} nodes, ${SEARCH_BUDGET_WALLMS}ms wall.`);
  console.log('');

  // One engine shared across both searches; each search starts from a
  // fresh importSave(initialBlob) at root and resets per-rollout the same
  // way. Building a second engine instance trips the module-singleton
  // collision in action-runner's progress/regular/basic categories.
  const engine = buildLooperSimEngine();
  const initialBlob = engine.saveManager!.exportSave();

  // ─── A* (h = 0) ──────────────────────────────────────────────────────
  console.log('## A* (h = 0 / uniform-cost)');
  const astarResult = astar(makeProblem(engine, initialBlob));
  console.log('');

  // ─── Beam(W=8) ───────────────────────────────────────────────────────
  console.log('## Beam(W=8)');
  const beamResult = beam(makeProblem(engine, initialBlob), 8);
  console.log('');

  // ─── Comparison table ────────────────────────────────────────────────
  console.log('## Comparison\n');
  console.log(
    renderTable(
      ['algo', 'found', 'simTime', 'expanded', 'generated', 'wallTime', 'termination'],
      [describe('A* (h=0)', astarResult), describe('Beam(W=8)', beamResult)],
    ),
  );
  console.log('');

  // ─── Trajectories ────────────────────────────────────────────────────
  if (astarResult.found) {
    console.log('## A* trajectory');
    console.log(fmtTrajectory(astarResult.trajectory));
    console.log('');
  }
  if (beamResult.found) {
    console.log('## Beam trajectory');
    console.log(fmtTrajectory(beamResult.trajectory));
    console.log('');
  }

  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
