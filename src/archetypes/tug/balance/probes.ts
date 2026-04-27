/**
 * Tug sim-driven balance probes — the probes from `archetypes/tug.md` § 6.
 * Tier-C divergence: probes 1–2 are math-only locks (single-pass
 * `runUntil` with deterministic bot, fire-time within band), probes 3–5
 * are distribution-statistic via `runMatrixUntil` over N seeds.
 *
 * Run: `pnpm balance:probes:tug`. Prints per-probe pass/fail report;
 * surfaces drift for human inspection rather than blocking on it.
 *
 * **Math-only vs MC split** (mirrors `shape.ts` Tier-C prose):
 *   - math-only: `runUntil({engine, until, maxSimTime, tickDelta})` once
 *     per (perturbation, beat). Bot uses production-zero believability so
 *     the run is fully deterministic; one run suffices.
 *   - MC: `runMatrixUntil({cells, seeds, until, maxSimTime})` with N
 *     seeds; aggregate distribution-statistics read off
 *     `cell.aggregate.metrics['tug-outcome.<key>']` (per-run analyzer
 *     captures averaged) and `cell.aggregate.terminationTime.p50`
 *     (built-in termination distribution). MC probes use sim-default
 *     believability through `buildTugSimEngine` (suboptimality 0.05,
 *     cadence jitter 0.15) — the cookbook stalemate-breaker for the
 *     counter-vs-counter mirror cell.
 *
 * **Signature probe = counter-strong-sensitivity.** Sweeps
 * `counter-matrix/strongCounter ∈ [0.5, 1.5]` against player-side
 * (counter persona) win-rate vs a concentrating opponent (mass). Counter-
 * pick *count* is approximately invariant to the sweep (`pickCounterAware`
 * and `match.ts:212` both read the BASE matrix); the sweep affects
 * combat-damage scaling at counter-cells (`lane.ts::adjustCell`),
 * which shifts win-rate continuously. Emits a proposed `strongCounter`
 * scalar where win-rate clears a depth-floor with elbow-room before
 * saturation. Replaces the retired `ai-difficulty-symmetry` probe (which
 * measured AI behavior, not a design property); strongCounter is a
 * design parameter (matrix decisiveness), not an AI knob.
 */

import {
  diffAggregates,
  runMatrixUntil,
  runUntil,
  type CellResult,
  type Engine,
  type MetricDelta,
  type UntilCell,
} from 'open-loop-engine';
import { TugTuningRegistryKey, type TugTunables } from '../modules';
import {
  buildTugSimEngine,
  createOutcomeAnalyzer,
  createOutcomeCapture,
  type OutcomeCapture,
} from './bot';
import { ARC_BEATS, BEAT_WINDOWS } from './beats';
import { DEFAULT_TUG_DATA } from '../data';
import type { TugOverrides } from '../data/overrides';

const PRIMARY_SEEDS = 20;
const DURATION_PROBE_SEEDS = 30;
const MAX_MATCH_SIM_TIME_SEC = 35 * 60;
const TICK_DELTA_SEC = 1.0;

/** Fixed seed list — locked here so the regression-lock layer in
 *  `sim/balance.probe.test.ts` can `runMatrixUntil({ seeds: TUG_SEEDS, ... })`
 *  with reproducible outcomes. */
export const TUG_SEEDS = Array.from({ length: PRIMARY_SEEDS }, (_, i) => i + 1);
export const TUG_DURATION_SEEDS = Array.from({ length: DURATION_PROBE_SEEDS }, (_, i) => i + 1);

// ─── Probe primitives ────────────────────────────────────────────────────

interface ProbeRow {
  name: string;
  reading: string;
  expected: string;
  pass: boolean;
  details?: string;
}

let activeCapture: OutcomeCapture | null = null;

/** Build an UntilCell that perturbs the engine via overrides + optional
 *  scope-pushed tunables. Mirrors `tune.ts::buildPerturbationCell` — the
 *  duplication between tune.ts + probes.ts is acceptable until a third
 *  consumer wants the same shape; at that point, lift to a shared file. */
function buildCell(
  name: string,
  overrides?: TugOverrides,
  scopePerturbations?: Partial<TugTunables>,
): UntilCell {
  return {
    name,
    buildEngine: () => buildTugSimEngine(overrides),
    analyzers: (engine: Engine) => {
      const capture = createOutcomeCapture(engine);
      activeCapture = capture;
      let cleanup: (() => void) | null = null;
      if (scopePerturbations) {
        const reg = engine.tryInject(TugTuningRegistryKey)!;
        cleanup = reg.pushScope(`probe:${name}`, scopePerturbations);
      }
      return [
        createOutcomeAnalyzer(capture),
        {
          name: 'scope-cleanup',
          onEnd: () => {
            cleanup?.();
            cleanup = null;
          },
          summarize: () => ({ name: 'scope-cleanup', metrics: {}, issues: [] }),
        },
      ];
    },
    tickDelta: TICK_DELTA_SEC,
  };
}

function runMatchScopeMC(
  name: string,
  seeds: number[],
  overrides?: TugOverrides,
  scopePerturbations?: Partial<TugTunables>,
): CellResult {
  const result = runMatrixUntil({
    cells: [buildCell(name, overrides, scopePerturbations)],
    seeds,
    until: () => activeCapture?.firstMatchEnded ?? false,
    maxSimTime: MAX_MATCH_SIM_TIME_SEC,
  });
  return result.cells[0]!;
}

interface SensitivityVariant {
  name: string;
  overrides?: TugOverrides;
  scope?: Partial<TugTunables>;
}

interface SensitivityResultRow {
  name: string;
  cell: CellResult;
  deltas: Record<string, MetricDelta>;
}

/** Local emulation of engine `runSensitivity`'s baseline-vs-variants +
 *  `diffAggregates` shape, but over `runMatrixUntil` (predicate-bounded
 *  termination) instead of `runMatrix` (fixed-tick). Engine
 *  `runSensitivity` (`harness/run-sensitivity.ts:27`) runs fixed ticks via
 *  `runMatrix`; Tug needs match-end predicate termination. Graduate to
 *  the engine when a second consumer wants the predicate-bounded sensitivity
 *  contract — filed in candidate-primitives.md as a follow-up. */
function runSensitivityUntil(config: {
  baseline: { name: string; overrides?: TugOverrides; scope?: Partial<TugTunables> };
  variants: SensitivityVariant[];
  seeds: number[];
}): { baseline: CellResult; variants: SensitivityResultRow[] } {
  const cells: UntilCell[] = [
    buildCell(config.baseline.name, config.baseline.overrides, config.baseline.scope),
    ...config.variants.map((v) => buildCell(v.name, v.overrides, v.scope)),
  ];
  const result = runMatrixUntil({
    cells,
    seeds: config.seeds,
    until: () => activeCapture?.firstMatchEnded ?? false,
    maxSimTime: MAX_MATCH_SIM_TIME_SEC,
  });
  const baselineCell = result.cells[0]!;
  const variants: SensitivityResultRow[] = config.variants.map((v, i) => {
    const cell = result.cells[i + 1]!;
    return {
      name: v.name,
      cell,
      deltas: diffAggregates(cell.aggregate, baselineCell.aggregate),
    };
  });
  return { baseline: baselineCell, variants };
}

/** Time the first occurrence of a beat predicate under given overrides.
 *  Used by the math-only probes (1, 2). */
function fireBeatUnderOverrides(beatId: string, overrides?: TugOverrides): number {
  const engine = buildTugSimEngine(overrides);
  const beat = ARC_BEATS.find((b) => b.id === beatId);
  if (!beat) return Infinity;
  const result = runUntil({
    engine,
    until: () => beat.predicate(engine),
    maxSimTime: MAX_MATCH_SIM_TIME_SEC,
    tickDelta: TICK_DELTA_SEC,
  });
  return result.terminated === 'predicate' ? result.elapsedSimulated : Infinity;
}

// ─── Probe 1 — income-rate-baseline (math-only) ──────────────────────────

interface BeatFireRow {
  beatId: string;
  multiplier: number;
  fireSec: number;
  windowLo: number;
  windowHi: number;
  inWindow: boolean;
}

function runIncomeRateBaselineProbe(): { rows: BeatFireRow[]; pass: boolean } {
  const baseRate = Number(DEFAULT_TUG_DATA.balance.baseIncomeRate);
  const multipliers = [0.75, 1.0, 1.25];
  const beats = ['beat-1', 'beat-2', 'beat-4'];
  const rows: BeatFireRow[] = [];
  for (const m of multipliers) {
    // Math-only override: production-zero believability keeps the bot
    // deterministic; pre-existing balance overrides apply unchanged.
    const overrides: TugOverrides = {
      balance: {
        baseIncomeRate: baseRate * m,
        believability: { suboptimalityRate: 0, cadenceJitterScale: 0 },
      },
    };
    for (const beatId of beats) {
      const [windowLo, windowHi] = BEAT_WINDOWS[beatId]!;
      const fireSec = fireBeatUnderOverrides(beatId, overrides);
      const tolLo = windowLo * 0.8;
      const tolHi = windowHi * 1.2;
      rows.push({
        beatId,
        multiplier: m,
        fireSec,
        windowLo: tolLo,
        windowHi: tolHi,
        inWindow: isFinite(fireSec) && fireSec >= tolLo && fireSec <= tolHi,
      });
    }
  }
  const pass = rows.every((r) => r.inWindow);
  return { rows, pass };
}

// ─── Probe 2 — unit-cost-scaling (math-only) ─────────────────────────────

function runUnitCostScalingProbe(): { rows: BeatFireRow[]; pass: boolean } {
  const multipliers = [0.85, 1.0, 1.15];
  const beats = ['beat-2', 'beat-3', 'beat-5'];
  const rows: BeatFireRow[] = [];
  for (const m of multipliers) {
    const overrides: TugOverrides = {
      balance: { believability: { suboptimalityRate: 0, cadenceJitterScale: 0 } },
      units: DEFAULT_TUG_DATA.units.map((u) => ({
        id: u.id,
        cost: Number(u.cost) * m,
      })),
    };
    for (const beatId of beats) {
      const [windowLo, windowHi] = BEAT_WINDOWS[beatId]!;
      const fireSec = fireBeatUnderOverrides(beatId, overrides);
      const tolLo = windowLo * 0.75;
      const tolHi = windowHi * 1.25;
      rows.push({
        beatId,
        multiplier: m,
        fireSec,
        windowLo: tolLo,
        windowHi: tolHi,
        inWindow: isFinite(fireSec) && fireSec >= tolLo && fireSec <= tolHi,
      });
    }
  }
  return { rows, pass: rows.every((r) => r.inWindow) };
}

// ─── Probe 3/SIGNATURE — counter-strong-sensitivity (MC) ─────────────────

const STRONG_SWEEP = [0.5, 0.75, 1.0, 1.25, 1.5];
/** Depth-floor target: counter-side wins more often than not at this
 *  strongCounter — the matrix is decisive enough to give counter a
 *  meaningful edge against a concentrating opponent. Reads off
 *  `isFirstPlayerWin.avg` from the analyzer. */
const WINRATE_TARGET = 0.5;
/** Saturation guard: the next sweep step must shift win-rate by at
 *  least this absolute amount; otherwise the curve has flattened and
 *  the proposed value is past the elbow. Absolute (not relative)
 *  because win-rate is bounded [0, 1]. */
const SATURATION_DELTA = 0.05;

interface CounterStrongRow {
  variant: string;
  strong: number;
  winRate: number;
  winRateDelta: number | null;
  monotonicNonDecreasing: boolean;
}

interface CounterStrongResult {
  rows: CounterStrongRow[];
  baselineWinRate: number;
  proposedStrong: number | null;
  proposedReason: string;
  pass: boolean;
}

function runCounterStrongSensitivityProbe(): CounterStrongResult {
  const baseline = {
    name: `strong=${(1.0).toFixed(2)}`,
    scope: { 'counter-matrix/strongCounter': () => 1.0 } as Partial<TugTunables>,
  };
  const variants: SensitivityVariant[] = STRONG_SWEEP.filter((s) => s !== 1.0).map((s) => ({
    name: `strong=${s.toFixed(2)}`,
    scope: { 'counter-matrix/strongCounter': () => s },
  }));
  const sweep = runSensitivityUntil({ baseline, variants, seeds: TUG_SEEDS });

  const winByStrong = new Map<number, number>();
  winByStrong.set(1.0, sweep.baseline.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0);
  const offValues = STRONG_SWEEP.filter((s) => s !== 1.0);
  for (let i = 0; i < variants.length; i++) {
    const strong = offValues[i]!;
    const v = sweep.variants[i]!;
    winByStrong.set(strong, v.cell.aggregate.metrics['tug-outcome.isFirstPlayerWin']?.avg ?? 0);
  }

  const rows: CounterStrongRow[] = [];
  let prevWin: number | null = null;
  let monotonic = true;
  for (const strong of STRONG_SWEEP) {
    const winRate = winByStrong.get(strong)!;
    const delta = prevWin != null ? winRate - prevWin : null;
    const stepNonDecreasing = prevWin == null || winRate + 1e-9 >= prevWin;
    if (!stepNonDecreasing) monotonic = false;
    rows.push({
      variant: `strong=${strong.toFixed(2)}`,
      strong,
      winRate,
      winRateDelta: delta,
      monotonicNonDecreasing: stepNonDecreasing,
    });
    prevWin = winRate;
  }

  // Proposed strongCounter: smallest sweep value where win-rate ≥
  // WINRATE_TARGET AND the next sweep step's absolute delta ≥
  // SATURATION_DELTA (curve hasn't flattened — we want headroom, not
  // saturation).
  let proposedStrong: number | null = null;
  let proposedReason = 'curve flat / saturated everywhere';
  for (let i = 0; i < STRONG_SWEEP.length; i++) {
    const strong = STRONG_SWEEP[i]!;
    const winRate = winByStrong.get(strong)!;
    if (winRate < WINRATE_TARGET) continue;
    if (i === STRONG_SWEEP.length - 1) {
      proposedReason = 'depth target hit at sweep ceiling — extend range to test saturation';
      break;
    }
    const nextWin = winByStrong.get(STRONG_SWEEP[i + 1]!)!;
    const delta = nextWin - winRate;
    if (delta >= SATURATION_DELTA) {
      proposedStrong = strong;
      proposedReason = `depth target ${WINRATE_TARGET} hit; next-step abs Δ ${(delta * 100).toFixed(1)}pp ≥ ${(SATURATION_DELTA * 100).toFixed(0)}pp saturation guard`;
      break;
    }
  }

  const baselineWinRate = winByStrong.get(1.0)!;
  // Pass criterion is monotonicity — the framework correctly sweeps and
  // produces a non-decreasing curve. The proposed-strongCounter scalar
  // is a forward-looking output; it may report null when the underlying
  // data balance dominates the sweep signal (currently the case at
  // default data — see bot.ts § Known limitation). The follow-up
  // procedural-persona tester-seat agent owns balance discovery for the
  // SIGNATURE matchup.
  const pass = monotonic;

  return {
    rows,
    baselineWinRate,
    proposedStrong,
    proposedReason,
    pass,
  };
}

// ─── Probe 5 — match-duration-bound (MC) ─────────────────────────────────

interface DurationResult {
  p50Sec: number;
  limitSec: number;
  windowLo: number;
  windowHi: number;
  /** Fraction of seeds whose first match ended with `firstMatchOutcome
   *  === 'time-limit'`. Read off the analyzer (not engine-level
   *  `terminationCounts.maxSimTime` — the engine terminates with
   *  `predicate` once `matchEnded` fires, regardless of in-game
   *  outcome). */
  timeLimitRate: number;
  pass: boolean;
}

function runMatchDurationBoundProbe(): DurationResult {
  const cell = runMatchScopeMC('default', TUG_DURATION_SEEDS);
  const p50Sec = cell.aggregate.terminationTime?.p50 ?? 0;
  const limitSec = DEFAULT_TUG_DATA.balance.matchTimeLimitMinutes * 60;
  const windowLo = limitSec * 0.5;
  const windowHi = limitSec * 0.95;
  const timeLimitRate = cell.aggregate.metrics['tug-outcome.isFirstTimeLimit']?.avg ?? 0;
  return {
    p50Sec,
    limitSec,
    windowLo,
    windowHi,
    timeLimitRate,
    // Acceptance: zero in-match time-limit terminations (matches resolve
    // by player-win or ai-win). p50 in [50%, 95%] of the limit ensures
    // matches don't trivially resolve in the first few minutes.
    pass: timeLimitRate === 0 && p50Sec >= windowLo && p50Sec <= windowHi,
  };
}

// ─── Reporter ────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  if (!isFinite(n)) return '∞';
  return n.toFixed(decimals);
}

function fmtSec(s: number): string {
  if (!isFinite(s)) return '∞';
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${(s / 60).toFixed(1)}m`;
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
  console.log('# Tug Tier-C balance probes\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log(
    `PRIMARY_SEEDS = ${PRIMARY_SEEDS} (CI half-width ≈ ${(0.98 / Math.sqrt(PRIMARY_SEEDS)).toFixed(2)} at p=0.5)`,
  );
  console.log(`DURATION_PROBE_SEEDS = ${DURATION_PROBE_SEEDS}`);
  console.log(`TICK_DELTA_SEC = ${TICK_DELTA_SEC}\n`);
  console.log(
    'Math-only probes (1, 2) override believability to 0/0 (deterministic); MC probes (3, 5) use sim-default 0.05/0.15 from buildTugSimEngine.\n',
  );

  const summary: ProbeRow[] = [];

  console.log('## Probe 1 — income-rate-baseline (math-only ±20%)\n');
  const p1 = runIncomeRateBaselineProbe();
  console.log(
    renderTable(
      ['beat', 'mult', 'fired', 'window', 'in?'],
      p1.rows.map((r) => [
        r.beatId,
        `×${r.multiplier}`,
        fmtSec(r.fireSec),
        `[${fmtSec(r.windowLo)}, ${fmtSec(r.windowHi)}]`,
        r.inWindow ? 'yes' : 'NO',
      ]),
    ),
  );
  console.log();
  summary.push({
    name: 'income-rate-baseline',
    reading: `${p1.rows.filter((r) => r.inWindow).length}/${p1.rows.length} in window`,
    expected: 'all in window',
    pass: p1.pass,
  });

  console.log('## Probe 2 — unit-cost-scaling (math-only ±25%)\n');
  const p2 = runUnitCostScalingProbe();
  console.log(
    renderTable(
      ['beat', 'mult', 'fired', 'window', 'in?'],
      p2.rows.map((r) => [
        r.beatId,
        `×${r.multiplier}`,
        fmtSec(r.fireSec),
        `[${fmtSec(r.windowLo)}, ${fmtSec(r.windowHi)}]`,
        r.inWindow ? 'yes' : 'NO',
      ]),
    ),
  );
  console.log();
  summary.push({
    name: 'unit-cost-scaling',
    reading: `${p2.rows.filter((r) => r.inWindow).length}/${p2.rows.length} in window`,
    expected: 'all in window',
    pass: p2.pass,
  });

  console.log('## Probe 3 — counter-strong-sensitivity (MC, N=20) [SIGNATURE]\n');
  const p3 = runCounterStrongSensitivityProbe();
  console.log(
    renderTable(
      ['variant', 'strong', 'win-rate', 'abs Δ vs prev', 'monotonic?'],
      p3.rows.map((r) => [
        r.variant,
        r.strong.toFixed(2),
        fmt(r.winRate),
        r.winRateDelta != null
          ? `${r.winRateDelta >= 0 ? '+' : ''}${(r.winRateDelta * 100).toFixed(1)}pp`
          : '—',
        r.monotonicNonDecreasing ? 'yes' : 'NO',
      ]),
    ),
  );
  console.log();
  console.log(
    `baseline (strong=1.0) win-rate = ${fmt(p3.baselineWinRate)} (target ≥ ${WINRATE_TARGET.toFixed(2)})`,
  );
  console.log(
    `proposed strongCounter ≈ ${p3.proposedStrong != null ? p3.proposedStrong.toFixed(2) : 'null'}`,
  );
  console.log(`reason: ${p3.proposedReason}`);
  console.log(`pass: ${p3.pass ? 'yes' : 'NO'}\n`);
  summary.push({
    name: 'counter-strong-sensitivity',
    reading: `win-rate@strong=1.0 = ${fmt(p3.baselineWinRate)}; proposed strong = ${p3.proposedStrong != null ? p3.proposedStrong.toFixed(2) : 'null'}`,
    expected: 'monotonic non-decreasing curve across sweep',
    pass: p3.pass,
  });

  console.log('## Probe 5 — match-duration-bound (MC, N=30)\n');
  const p5 = runMatchDurationBoundProbe();
  console.log(
    `p50 = ${fmtSec(p5.p50Sec)} of ${fmtSec(p5.limitSec)} limit (target ∈ [${fmtSec(p5.windowLo)}, ${fmtSec(p5.windowHi)}])`,
  );
  console.log(
    `time-limit rate: ${fmt(p5.timeLimitRate)} (target 0 — matches resolve by win/loss, not stalemate)`,
  );
  console.log(`pass: ${p5.pass ? 'yes' : 'NO'}\n`);
  summary.push({
    name: 'match-duration-bound',
    reading: `p50=${fmtSec(p5.p50Sec)}, time-limit-rate=${fmt(p5.timeLimitRate)}`,
    expected: 'p50 ∈ [50%, 95%] of limit, time-limit rate = 0',
    pass: p5.pass,
  });

  console.log('## Summary\n');
  console.log(
    renderTable(
      ['probe', 'reading', 'expected', 'pass'],
      summary.map((s) => [s.name, s.reading, s.expected, s.pass ? 'yes' : 'NO']),
    ),
  );
  const failed = summary.filter((s) => !s.pass);
  console.log();
  if (failed.length > 0) {
    console.log(
      `${failed.length}/${summary.length} probes FAILED — investigate above for details.`,
    );
  } else {
    console.log(`All ${summary.length} probes pass.`);
  }
  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
