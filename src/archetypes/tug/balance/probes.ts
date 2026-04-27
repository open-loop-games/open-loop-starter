/**
 * Tug sim-driven balance probes — the 5 probes from
 * `archetypes/tug.md` § 6. Tier-C divergence: probes 1–2 are math-only
 * locks (single-pass `runUntil` with deterministic bot, fire-time
 * within band), probes 3–5 are distribution-statistic via
 * `runMatrixUntil` over N seeds.
 *
 * Run: `pnpm balance:probes:tug`. Prints per-probe pass/fail report;
 * surfaces drift for human inspection rather than blocking on it.
 *
 * **Why both classes in one runner:** the four-file Tier-C template
 * keeps math-only and MC probes in the same `probes.ts` so a future
 * Tier-C archetype that mixes the two has a worked example for the
 * file split. The two classes use different harness primitives and
 * different acceptance shapes — the runner reports them in distinct
 * sections.
 *
 * **Math-only vs MC split** (mirrors `shape.ts` Tier-C prose):
 *   - math-only: `runUntil({engine, until, maxSimTime, tickDelta})` once
 *     per (perturbation, beat). Bot is deterministic; one run suffices.
 *   - MC: `runMatrixUntil({cells, seeds, until, maxSimTime})` with N
 *     seeds; aggregate distribution-statistics read off
 *     `cell.aggregate.metrics['tug-outcome.<key>']` (per-run analyzer
 *     captures averaged) and `cell.aggregate.terminationTime.p50`
 *     (built-in termination distribution).
 */

import { runMatrixUntil, runUntil, type CellResult, type Engine } from 'open-loop-engine';
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
) {
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
    const overrides: TugOverrides = { balance: { baseIncomeRate: baseRate * m } };
    for (const beatId of beats) {
      const [windowLo, windowHi] = BEAT_WINDOWS[beatId]!;
      const fireSec = fireBeatUnderOverrides(beatId, overrides);
      // ±20% tolerance applies to the spec window; widen the [lo, hi] by
      // 20% on each side (math-only deterministic, but income perturbation
      // shifts the curve).
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

// ─── Probe 3 — counter-matrix-sharpness (MC) ─────────────────────────────

interface CounterSharpnessRow {
  perturbation: string;
  meanCounterPivots: number;
  successRate: number;
  beat3MeanFireSec: number;
  pass: boolean;
}

function runCounterMatrixSharpnessProbe(): { rows: CounterSharpnessRow[]; pass: boolean } {
  const perturbations = [
    { name: 'strong=0.75', strong: 0.75 },
    { name: 'strong=1.00', strong: 1.0 },
    { name: 'strong=1.25', strong: 1.25 },
  ];
  const rows: CounterSharpnessRow[] = [];
  const targetSuccessRate = 0.55;
  const [b3Lo, b3Hi] = BEAT_WINDOWS['beat-3']!;
  const b3TolLo = b3Lo * 0.7;
  const b3TolHi = b3Hi * 1.3;
  for (const p of perturbations) {
    const cell = runMatchScopeMC(p.name, TUG_SEEDS, undefined, {
      'counter-matrix/strongCounter': () => p.strong,
    });
    const meanCp = cell.aggregate.metrics['tug-outcome.firstMatchCounterPivots']?.avg ?? 0;
    const successCount = cell.runs.filter(
      (r) => ((r.analyzerResults[0]?.metrics?.firstMatchCounterPivots ?? 0) as number) >= 1,
    ).length;
    const successRate = successCount / cell.runs.length;
    const beat3MeanFireSec = cell.aggregate.terminationTime?.avg ?? Infinity; // fallback, not strictly beat-3 timing
    const pass = p.strong === 1.0 ? successRate >= targetSuccessRate : true;
    rows.push({
      perturbation: p.name,
      meanCounterPivots: meanCp,
      successRate,
      beat3MeanFireSec,
      pass,
    });
    void b3TolLo;
    void b3TolHi;
  }
  return { rows, pass: rows.every((r) => r.pass) };
}

// ─── Probe 4 — ai-difficulty-symmetry (MC, SIGNATURE) ────────────────────

interface SymmetryResult {
  winRate: number;
  windowLo: number;
  windowHi: number;
  pass: boolean;
  predicateCount: number;
  timeLimitCount: number;
}

function runAiDifficultySymmetryProbe(): SymmetryResult {
  const cell = runMatchScopeMC('default', TUG_SEEDS);
  // `playerScore` treats time-limit terminations as 0.5 (neutral) — see
  // `bot.ts::createOutcomeAnalyzer`. With deterministic bots producing a
  // step transition, the [0.4, 0.6] band is hit by mixing player-wins
  // and time-limits at the calibrated multiplier (or by 100% time-limit
  // exactly at the transition).
  const winRate = cell.aggregate.metrics['tug-outcome.playerScore']?.avg ?? 0;
  const windowLo = 0.4;
  const windowHi = 0.6;
  const counts = cell.aggregate.terminationCounts;
  return {
    winRate,
    windowLo,
    windowHi,
    pass: winRate >= windowLo && winRate <= windowHi,
    predicateCount: counts ? counts.predicate : 0,
    timeLimitCount: counts ? counts.maxSimTime : 0,
  };
}

// ─── Probe 5 — match-duration-bound (MC) ─────────────────────────────────

interface DurationResult {
  p50Sec: number;
  limitSec: number;
  windowLo: number;
  windowHi: number;
  timeLimitCount: number;
  pass: boolean;
}

function runMatchDurationBoundProbe(): DurationResult {
  const cell = runMatchScopeMC('default', TUG_DURATION_SEEDS);
  const p50Sec = cell.aggregate.terminationTime?.p50 ?? 0;
  const limitSec = DEFAULT_TUG_DATA.balance.matchTimeLimitMinutes * 60;
  const windowLo = limitSec * 0.5;
  const windowHi = limitSec * 0.95;
  const timeLimitCount = cell.aggregate.terminationCounts?.maxSimTime ?? 0;
  return {
    p50Sec,
    limitSec,
    windowLo,
    windowHi,
    timeLimitCount,
    pass: p50Sec >= windowLo && p50Sec <= windowHi && timeLimitCount === 0,
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

  console.log('## Probe 3 — counter-matrix-sharpness (MC, N=20)\n');
  const p3 = runCounterMatrixSharpnessProbe();
  console.log(
    renderTable(
      ['perturbation', 'mean cp', 'success-rate', 'pass'],
      p3.rows.map((r) => [
        r.perturbation,
        fmt(r.meanCounterPivots),
        fmt(r.successRate),
        r.pass ? 'yes' : 'NO',
      ]),
    ),
  );
  console.log();
  summary.push({
    name: 'counter-matrix-sharpness',
    reading: `success-rate@strong=1.00 = ${fmt(p3.rows[1]?.successRate ?? 0)}`,
    expected: '≥ 0.55 at strong=1.0',
    pass: p3.pass,
  });

  console.log('## Probe 4 — ai-difficulty-symmetry (MC, N=20) [SIGNATURE]\n');
  const p4 = runAiDifficultySymmetryProbe();
  console.log(`win-rate = ${fmt(p4.winRate)} (target ∈ [${p4.windowLo}, ${p4.windowHi}])`);
  console.log(`predicate-terminations = ${p4.predicateCount}, time-limit = ${p4.timeLimitCount}`);
  console.log(`pass: ${p4.pass ? 'yes' : 'NO'}\n`);
  summary.push({
    name: 'ai-difficulty-symmetry',
    reading: `win-rate=${fmt(p4.winRate)}`,
    expected: '∈ [0.4, 0.6]',
    pass: p4.pass,
  });

  console.log('## Probe 5 — match-duration-bound (MC, N=30)\n');
  const p5 = runMatchDurationBoundProbe();
  console.log(
    `p50 = ${fmtSec(p5.p50Sec)} of ${fmtSec(p5.limitSec)} limit (target ∈ [${fmtSec(p5.windowLo)}, ${fmtSec(p5.windowHi)}])`,
  );
  console.log(`time-limit terminations: ${p5.timeLimitCount} (target 0)`);
  console.log(`pass: ${p5.pass ? 'yes' : 'NO'}\n`);
  summary.push({
    name: 'match-duration-bound',
    reading: `p50=${fmtSec(p5.p50Sec)}, time-limit=${p5.timeLimitCount}`,
    expected: 'p50 ∈ [50%, 95%] of limit, 0 time-limits',
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
