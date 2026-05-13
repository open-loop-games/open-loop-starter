/**
 * Tug balance tuner — Tier-C distribution-statistic characterizer.
 *
 * **Sensitivity-shaped, not bisection-shaped.** Tug's signature is the
 * counter-matrix sensitivity curve, not a single number found by 1-D
 * bisection. The four-file Tier-C template (`shape.ts` / `beats.ts` /
 * `bot.ts` / `tune.ts`) stays intact for archetypes whose signature *is*
 * bisection-shaped; here, `tune.ts` runs the counter-strong sweep as a
 * sample curve + a single-axis `bisectTuner` that proposes the elbow
 * value over the same axis.
 *
 * Replaces the Tier-A `solve.ts` pattern — chained Gauss-Seidel single-
 * knob bisection. Tug outcomes are stochastic; `runMatrixUntil` builds
 * a fresh engine per `(cell, seed)`.
 *
 * Run: `pnpm balance:tune:tug`. Prints the sweep curve + a proposed
 * `strongCounter` line; does NOT mutate data files — the human picks and
 * edits scaffolding based on the output, per `archetypes/BALANCING.md`.
 *
 * **Step solver up incrementally** (per project memory): the
 * `aiIncomeMultiplier` and `unit-cost-marine` axes from the OL-711 first
 * cut are gone — `aiIncomeMultiplier` is an AI-quirk knob (filed as a
 * difficulty-dial follow-up), not a balance lever; per-unit cost
 * tuning belongs in a per-archetype dominance probe (Candidate B
 * follow-up).
 */

import { bisectTuner, runMatrixUntil, type CellResult, type UntilCell } from '@open-loop/engine';
import { TugTuningRegistryKey, type TugTunables } from '../modules';
import {
  buildTugSimEngine,
  createOutcomeAnalyzer,
  createOutcomeCapture,
  type OutcomeCapture,
} from './bot';
import type { TugOverrides } from '../data/overrides';

// ─── Calibration ─────────────────────────────────────────────────────────

/** Number of seeds per cell. Bump to 50 if the curve is too noisy to
 *  identify an elbow cleanly. Binomial CI half-width: N=20 → ≈ 0.22,
 *  N=50 → ≈ 0.14. */
const PRIMARY_SEEDS = 20;

/** Match-length sim-time ceiling per seed. Default match limit is 30
 *  minutes; 35 gives 5 minutes of buffer for time-limit terminations. */
const MAX_MATCH_SIM_TIME_SEC = 35 * 60;

/** Coarse tickDelta for sim-speed. Per project memory, balance is
 *  math-first and sim only verifies; coarse tick is the convention. */
const TICK_DELTA_SEC = 1.0;

/** Sweep values for the curve characterization. Mirrors `probes.ts`'s
 *  STRONG_SWEEP so tune output and the SIGNATURE probe read the same
 *  axis at the same resolution. */
const STRONG_SWEEP = [0.5, 0.75, 1.0, 1.25, 1.5];

/** Depth-floor target — counter-side win-rate vs the concentrating
 *  opponent (mass). Same target as `probes.ts::WINRATE_TARGET`. The
 *  bisectTuner invocation finds the strongCounter where win-rate equals
 *  this; the curve sample contextualizes it. */
const WINRATE_TARGET = 0.5;

// ─── activeCapture indirection ──────────────────────────────────────────

let activeCapture: OutcomeCapture | null = null;

function buildPerturbationCell(
  name: string,
  overrides?: TugOverrides,
  scopePerturbations?: Partial<TugTunables>,
): UntilCell {
  return {
    name,
    buildEngine: () => buildTugSimEngine(overrides),
    analyzers: (engine) => {
      const capture = createOutcomeCapture(engine);
      activeCapture = capture;
      let scopeCleanup: (() => void) | null = null;
      if (scopePerturbations) {
        const reg = engine.tryInject(TugTuningRegistryKey)!;
        scopeCleanup = reg.pushScope(`tune:${name}`, scopePerturbations);
      }
      return [
        createOutcomeAnalyzer(capture),
        {
          name: 'scope-cleanup',
          onEnd: () => {
            scopeCleanup?.();
            scopeCleanup = null;
          },
          summarize: () => ({ name: 'scope-cleanup', metrics: {}, issues: [] }),
        },
      ];
    },
    tickDelta: TICK_DELTA_SEC,
  };
}

// ─── Samplers ────────────────────────────────────────────────────────────

function sampleAtCell(cell: UntilCell, seedCount: number): CellResult {
  const seeds = Array.from({ length: seedCount }, (_, i) => i + 1);
  const result = runMatrixUntil({
    cells: [cell],
    seeds,
    until: () => activeCapture?.firstMatchEnded ?? false,
    maxSimTime: MAX_MATCH_SIM_TIME_SEC,
  });
  return result.cells[0]!;
}

function readWinRate(cell: CellResult): number {
  return cell.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0;
}

function sampleCounterStrong(value: number): number {
  const cell = buildPerturbationCell(`counter-strong=${value.toFixed(3)}`, undefined, {
    'counter-matrix/strongCounter': () => value,
  });
  return readWinRate(sampleAtCell(cell, PRIMARY_SEEDS));
}

// ─── Output ──────────────────────────────────────────────────────────────

interface SweepRow {
  strong: number;
  winRate: number;
}

function runSweep(): SweepRow[] {
  const rows: SweepRow[] = [];
  for (const strong of STRONG_SWEEP) {
    const cell = buildPerturbationCell(`sweep:strong=${strong.toFixed(2)}`, undefined, {
      'counter-matrix/strongCounter': () => strong,
    });
    const winRate = readWinRate(sampleAtCell(cell, PRIMARY_SEEDS));
    rows.push({ strong, winRate });
  }
  return rows;
}

function fmt(n: number, decimals = 3): string {
  if (!isFinite(n)) return '∞';
  return n.toFixed(decimals);
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

  console.log('# Tug balance tuner — counter-strong sensitivity characterizer\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log('Tug signature is sensitivity-shaped (matrix sharpness curve),');
  console.log('not bisection-shaped. The sweep below characterizes mean');
  console.log('counter-pivots-per-match across `counter-matrix/strongCounter`,');
  console.log('then bisectTuner lands on the value where cp.avg ≈ depth-floor.\n');
  console.log(
    `PRIMARY_SEEDS = ${PRIMARY_SEEDS} (CI half-width ≈ ${(0.98 / Math.sqrt(PRIMARY_SEEDS)).toFixed(2)} at p=0.5)`,
  );
  console.log(`MAX_MATCH_SIM_TIME_SEC = ${MAX_MATCH_SIM_TIME_SEC}s`);
  console.log(`TICK_DELTA_SEC = ${TICK_DELTA_SEC}s`);
  console.log(`WINRATE_TARGET = ${WINRATE_TARGET}`);
  console.log('No data files mutated. Review proposed-patch table below.\n');

  console.log('## Sample curve — counter-strong vs counter-side win-rate\n');
  const sweep = runSweep();
  console.log(
    renderTable(
      ['strong', 'win-rate'],
      sweep.map((r) => [r.strong.toFixed(2), fmt(r.winRate)]),
    ),
  );
  console.log();

  console.log('## Bisection on counter-strong — depth-floor target\n');
  console.log(`Target: win-rate = ${WINRATE_TARGET}; tolerance ±0.10.\n`);
  const tuned = bisectTuner({
    lo: 0.5,
    hi: 1.5,
    targetSec: WINRATE_TARGET,
    tolSec: 0.1,
    sampler: sampleCounterStrong,
    maxIters: 8,
  });
  console.log(`proposed strongCounter ≈ ${fmt(tuned.value)}`);
  console.log(
    `win-rate at proposal ≈ ${fmt(tuned.time)} (target ${WINRATE_TARGET}, dir=${tuned.direction}, ${tuned.iterations} iter)\n`,
  );

  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
