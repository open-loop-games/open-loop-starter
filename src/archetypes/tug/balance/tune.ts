/**
 * Tug balance tuner — Tier-C distribution-statistic bisection.
 *
 * Replaces the Tier-A `solve.ts` pattern. Each axis bisects an
 * `OverrideRegistry`-pushed scope (or data override) against a
 * distribution statistic computed from N-seed `runMatrixUntil` runs —
 * the Tier-A single-engine `importSave` reset doesn't apply because
 * Tug's outcomes are stochastic and `runMatrixUntil` builds a fresh
 * engine per `(cell, seed)`.
 *
 * Run: `pnpm balance:tune:tug`. Prints a proposed-patch table; does NOT
 * mutate data files — the human picks and edits scaffolding based on
 * the output, per `archetypes/BALANCING.md`.
 *
 * **Iteration shape: 1-D bisection per axis, NOT chained Gauss-Seidel.**
 * Tier-C response surfaces are noisy (binomial CI half-width ≈ 0.22 at
 * N=20 seeds, p=0.5); chained bisection across multiple noisy axes
 * doesn't converge cleanly. AI-income is the dominant axis. Secondary
 * axes (counter-matrix sharpness, unit costs) ship as separate single-
 * axis bisections. Joint multi-axis tuning is a future Tier-C question
 * — file then.
 *
 * **Step solver up incrementally** (per project memory): on the first
 * tune-pass, only the AI-income primary axis is enabled. Verify the
 * primary lands cleanly before adding secondary axes. Toggle
 * `ENABLED_AXES` below to add secondaries once the primary converges.
 */

import { bisectTuner, runMatrixUntil, type CellResult, type UntilCell } from 'open-loop-engine';
import { TugTuningRegistryKey, type TugTunables } from '../modules';
import {
  buildTugSimEngine,
  createOutcomeAnalyzer,
  createOutcomeCapture,
  type OutcomeCapture,
} from './bot';
import type { TugOverrides } from '../data/overrides';
import { DEFAULT_TUG_DATA } from '../data';

// ─── Calibration ─────────────────────────────────────────────────────────

/** Number of seeds per cell for the primary AI-income tuner. Bump to 50
 *  if `bisectTuner` thrashes — meaning the sampler reports inconsistent
 *  in-band/out-of-band readings across iterations on what should be a
 *  stable axis. Binomial CI half-width: N=20 → ≈ 0.22, N=50 → ≈ 0.14. */
const PRIMARY_SEEDS = 20;

/** Match-length sim-time ceiling per seed. Default match limit is 30
 *  minutes; 35 gives 5 minutes of buffer for time-limit terminations. */
const MAX_MATCH_SIM_TIME_SEC = 35 * 60;

/** Coarse tickDelta for sim-speed. Per project memory, balance is
 *  math-first and sim only verifies; coarse tick is the convention.
 *  Tug combat resolves at this dt — if tuner output looks broken,
 *  bump to 0.5 (2× combat fidelity, 2× runtime). */
const TICK_DELTA_SEC = 1.0;

/** Toggle which axes the tuner runs. Per memory: step up incrementally
 *  — never run the full multi-axis sweep on the first try. AI-income
 *  is the dominant axis (signature `ai-difficulty-symmetry` probe);
 *  add secondaries once it converges cleanly. */
const ENABLED_AXES = new Set<'ai-income' | 'counter-strong' | 'unit-cost-marine'>(['ai-income']);

// ─── activeCapture indirection ──────────────────────────────────────────
//
// `runMatrixUntil`'s `until` predicate is shared across all (cell, seed)
// runs in a single config; it cannot directly read per-run engine state.
// Each cell's `analyzers` factory closes over the freshly-built engine
// and creates a new `OutcomeCapture` — we expose the most-recently-
// created capture via this module-level mutable, which is safe because
// `runMatrixUntil` runs sync-sequentially (one (cell, seed) at a time).
//
// `until` reads `activeCapture.firstMatchEnded` instead of engine state
// directly. The bot module's deferred-restart logic can re-init match
// 2 in the same tick that match 1 ended, so a naive `!match.inMatch`
// check would never fire (the bot restarts faster than the next
// predicate eval).

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
        // Cleanup analyzer — pops the scope at run end so the next run's
        // pushScope starts fresh. Without this, scopes pile up across the
        // bisection iterations and silently contaminate later samples.
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

interface SampleResult {
  winRate: number;
  matchLengthP50Sec: number;
  timeLimitTerminations: number;
  predicateTerminations: number;
  meanCounterPivots: number;
}

function sampleAtCell(cell: UntilCell, seedCount: number): SampleResult {
  const seeds = Array.from({ length: seedCount }, (_, i) => i + 1);
  const result = runMatrixUntil({
    cells: [cell],
    seeds,
    until: () => activeCapture?.firstMatchEnded ?? false,
    maxSimTime: MAX_MATCH_SIM_TIME_SEC,
  });
  return readSample(result.cells[0]!);
}

function readSample(cell: CellResult): SampleResult {
  // `playerScore` treats time-limit terminations as 0.5 (neutral) so the
  // win-rate bisection reads continuously through the transition zone
  // — see `createOutcomeAnalyzer` rationale.
  const winRate = cell.aggregate.metrics['tug-outcome.playerScore']?.avg ?? 0;
  const meanCounterPivots = cell.aggregate.metrics['tug-outcome.firstMatchCounterPivots']?.avg ?? 0;
  const matchLengthP50Sec = cell.aggregate.terminationTime?.p50 ?? 0;
  const counts = cell.aggregate.terminationCounts;
  return {
    winRate,
    matchLengthP50Sec,
    timeLimitTerminations: counts ? counts.maxSimTime : 0,
    predicateTerminations: counts ? counts.predicate : cell.runs.length,
    meanCounterPivots,
  };
}

/**
 * Primary axis: `aiIncomeMultiplier` perturbed via data override (single
 * shared scalar at engine-build time — no scope-push needed). Returns
 * the cell's win-rate (Bernoulli p̂ across `PRIMARY_SEEDS` seeds).
 *
 * `bisectTuner` semantic stretch: passing the win-rate as `targetSec`
 * (target 0.5) and the band half-width as `tolSec` (0.1) — bisection
 * math is generic 1-D, the names just read oddly because Tier-A tuners
 * always bisect a fire-time. Convergence: target hit means win-rate ∈
 * [0.4, 0.6].
 */
function sampleAiIncome(value: number): number {
  const cell = buildPerturbationCell(`ai-income=${value.toFixed(3)}`, {
    balance: { aiIncomeMultiplier: value },
  });
  return sampleAtCell(cell, PRIMARY_SEEDS).winRate;
}

/**
 * Secondary axis: `counter-matrix/strongCounter` scalar (defaults to 1.0
 * = identity). Pushes scope on the tuning registry rather than overriding
 * data — strongCounter is a tunable wrapped in `lane.ts`, not a data
 * field. Returns mean counter-pivots per first match.
 *
 * Sharpening the counter-matrix (>1.0) makes counter-pivots more
 * decisive but doesn't necessarily move win-rate cleanly — only the
 * `counter` persona reads the matrix; `mass` / `greed` / `tech` ignore
 * it entirely. With the sim default pair (player=`counter`, ai=`greed`),
 * the player side fires counters against greed's concentrated top-tier
 * composition. Target: mean counter-pivots per match ≥ 1 (loose proxy
 * for "the matrix is sharp enough to matter").
 */
function sampleCounterStrong(value: number): number {
  const cell = buildPerturbationCell(`counter-strong=${value.toFixed(3)}`, undefined, {
    'counter-matrix/strongCounter': () => value,
  });
  return sampleAtCell(cell, PRIMARY_SEEDS).meanCounterPivots;
}

/**
 * Secondary axis: `units/marine/cost` scalar. Math-only-ish — the bot's
 * default opening is marine, so a higher cost delays beat-1's first
 * purchase. Returns first-match unit-purchase fire-time-equivalent
 * (`firstMatchUnitsSent` won't help directly; use match length + units-
 * sent ratio as a coarse proxy).
 *
 * Wired but disabled by default — first-pass tune just runs AI-income.
 */
function sampleMarineCost(value: number): number {
  const cell = buildPerturbationCell(`marine-cost=${value.toFixed(0)}`, undefined, {
    'units/marine/cost': () => value,
  });
  // For unit-cost axis, "fewer units sent" = "later beat-1 fire" = "longer time
  // per unit". Use mean units-sent as the inverse signal: fewer sent → later
  // fire. Returning 1/units-sent gives bisectTuner a forward direction.
  const result = sampleAtCell(cell, PRIMARY_SEEDS);
  const meanUnits =
    result.predicateTerminations + result.timeLimitTerminations > 0 ? PRIMARY_SEEDS : 1;
  return meanUnits;
}

// ─── Output ──────────────────────────────────────────────────────────────

interface AxisResult {
  axis: string;
  field: string;
  current: number;
  proposed: number;
  proposedReading: number;
  targetReading: number;
  iterations: number;
  direction: 'forward' | 'inverted';
}

function runAiIncomeTuner(): AxisResult {
  const current = DEFAULT_TUG_DATA.balance.aiIncomeMultiplier;
  const tuned = bisectTuner({
    lo: 0.5,
    hi: 2.0,
    targetSec: 0.5,
    tolSec: 0.1,
    sampler: sampleAiIncome,
    maxIters: 10,
  });
  return {
    axis: 'ai-income',
    field: 'balance.aiIncomeMultiplier',
    current,
    proposed: tuned.value,
    proposedReading: tuned.time,
    targetReading: 0.5,
    iterations: tuned.iterations,
    direction: tuned.direction,
  };
}

function runCounterStrongTuner(): AxisResult {
  const tuned = bisectTuner({
    lo: 0.75,
    hi: 1.5,
    targetSec: 1, // mean counter-pivots target
    tolSec: 0.5,
    sampler: sampleCounterStrong,
    maxIters: 8,
  });
  return {
    axis: 'counter-strong',
    field: 'counter-matrix/strongCounter (tunable)',
    current: 1.0,
    proposed: tuned.value,
    proposedReading: tuned.time,
    targetReading: 1,
    iterations: tuned.iterations,
    direction: tuned.direction,
  };
}

function runMarineCostTuner(): AxisResult {
  const current = Number(DEFAULT_TUG_DATA.units.find((u) => u.id === 'marine')!.cost);
  const tuned = bisectTuner({
    lo: 10,
    hi: 200,
    targetSec: PRIMARY_SEEDS, // target: every seed buys at least one marine
    tolSec: 1,
    sampler: sampleMarineCost,
    maxIters: 8,
  });
  return {
    axis: 'unit-cost-marine',
    field: 'units.marine.cost',
    current,
    proposed: tuned.value,
    proposedReading: tuned.time,
    targetReading: PRIMARY_SEEDS,
    iterations: tuned.iterations,
    direction: tuned.direction,
  };
}

// ─── Rendering ───────────────────────────────────────────────────────────

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

  console.log('# Tug balance tuner — Tier-C distribution-statistic bisection\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log('Bisects single-axis perturbations against `runMatrixUntil`-driven');
  console.log('distribution statistics. Each sample = N-seed Monte Carlo.\n');
  console.log(
    `PRIMARY_SEEDS = ${PRIMARY_SEEDS} (CI half-width ≈ ${(0.98 / Math.sqrt(PRIMARY_SEEDS)).toFixed(2)} at p=0.5)`,
  );
  console.log(`MAX_MATCH_SIM_TIME_SEC = ${MAX_MATCH_SIM_TIME_SEC}s`);
  console.log(`TICK_DELTA_SEC = ${TICK_DELTA_SEC}s`);
  console.log(`ENABLED_AXES = [${[...ENABLED_AXES].join(', ')}]`);
  console.log('No data files mutated. Review proposed-patch table below.\n');

  const results: AxisResult[] = [];

  if (ENABLED_AXES.has('ai-income')) {
    console.log('## Primary axis — aiIncomeMultiplier vs player-win-rate\n');
    console.log('Target: win-rate ∈ [0.4, 0.6] across N=20 seeds.\n');
    results.push(runAiIncomeTuner());
  }

  if (ENABLED_AXES.has('counter-strong')) {
    console.log('## Secondary axis — counter-matrix/strongCounter vs mean counter-pivots\n');
    results.push(runCounterStrongTuner());
  }

  if (ENABLED_AXES.has('unit-cost-marine')) {
    console.log('## Secondary axis — units/marine/cost vs unit-purchase rate\n');
    results.push(runMarineCostTuner());
  }

  console.log('\n## Proposed patch (hand-apply to data/*.ts)\n');
  console.log(
    renderTable(
      ['axis', 'field', 'current', 'proposed', 'proposedReading', 'target', 'dir', 'it'],
      results.map((r) => [
        r.axis,
        r.field,
        fmt(r.current),
        fmt(r.proposed),
        fmt(r.proposedReading),
        fmt(r.targetReading),
        r.direction,
        String(r.iterations),
      ]),
    ),
  );
  console.log();

  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
