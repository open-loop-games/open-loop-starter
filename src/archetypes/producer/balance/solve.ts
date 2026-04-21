/**
 * Producer balance solver — engine as oracle.
 *
 * Each beat gets bisected against `runArcProbe` driving the production bot
 * (`buildProducerSimEngine`). The engine plays the game; the solver tunes a
 * parameter until the beat's fire time lands on target. No parallel mechanics
 * model, no closed-form inversions — the bot's behaviour *is* the model.
 *
 * Run: `pnpm balance:solve:producer`. Prints a proposed-patch report. Does
 * NOT mutate data files.
 *
 * Scope: beat-2 only for now. Every beat added extends this script rather
 * than growing a new one — the primitives (`runSingleBeat`, `bisect`) are
 * the only scaffolding.
 */

import { runArcProbe } from '@/balance';
import type { ProducerOverrides } from '..';
import { DEFAULT_PRODUCER_DATA } from '../data';
import { ARC_BEATS, BEAT_WINDOWS } from './beats';
import { buildProducerSimEngine } from './bot';

const BUDGET_SEC = BEAT_WINDOWS['beat-8']![1] * 2.5;

// ─── Oracle ───────────────────────────────────────────────────────────────

/**
 * Run a single beat's predicate against the engine with the given overrides.
 * Returns the sim-second the beat first fired, or `Infinity` if it didn't.
 * Single seed — the bot is deterministic, extra seeds would only confirm it.
 */
function runSingleBeat(overrides: ProducerOverrides, beatId: string): number {
  const beat = ARC_BEATS.find((b) => b.id === beatId);
  if (!beat) throw new Error(`no beat ${beatId} in ARC_BEATS`);

  const [result] = runArcProbe({
    buildEngine: () => buildProducerSimEngine(overrides),
    beats: [beat],
    seeds: [0],
    maxSimTime: BUDGET_SEC,
    tickDelta: 1,
  });
  if (!result || result.counts.predicate === 0) return Infinity;
  return result.terminationTime?.p50 ?? Infinity;
}

// ─── Search ───────────────────────────────────────────────────────────────

interface BisectResult {
  value: number;
  time: number;
  iterations: number;
  /** Detected slope: 'forward' means higher value → later fire time. */
  direction: 'forward' | 'inverted';
}

/**
 * Bisect a 1-D parameter against a sampler that returns fire time.
 *
 * Auto-detects direction from `sampler(lo)` vs `sampler(hi)`. That costs two
 * calibration runs up front but removes a per-beat decision the caller would
 * otherwise have to make correctly (and getting it wrong silently gives a
 * wrong answer). For producer params, most are 'forward' (higher cost → later
 * fire), but multiplier-like knobs (milestoneBonus) are 'inverted'.
 */
function bisect({
  lo,
  hi,
  targetSec,
  sampler,
  tolSec = 1,
  maxIters = 22,
}: {
  lo: number;
  hi: number;
  targetSec: number;
  sampler: (value: number) => number;
  tolSec?: number;
  maxIters?: number;
}): BisectResult {
  const tLo = sampler(lo);
  const tHi = sampler(hi);

  // Infinite = beat never fires at that value. Clamp into direction detection:
  // if hi-side never fires it's effectively "much later", forward. If lo-side
  // never fires it's an infeasible bracket regardless.
  const tLoFinite = isFinite(tLo) ? tLo : -Infinity;
  const tHiFinite = isFinite(tHi) ? tHi : +Infinity;
  const direction: 'forward' | 'inverted' = tHiFinite >= tLoFinite ? 'forward' : 'inverted';

  let a = lo;
  let b = hi;
  let best = { value: (lo + hi) / 2, time: Infinity, iterations: 0 };
  for (let i = 1; i <= maxIters; i++) {
    const mid = (a + b) / 2;
    const t = sampler(mid);
    const delta = Math.abs((isFinite(t) ? t : Number.MAX_SAFE_INTEGER) - targetSec);
    const bestDelta = Math.abs(
      (isFinite(best.time) ? best.time : Number.MAX_SAFE_INTEGER) - targetSec,
    );
    if (delta < bestDelta) best = { value: mid, time: t, iterations: i };
    if (isFinite(t) && Math.abs(t - targetSec) <= tolSec) {
      return { value: mid, time: t, iterations: i, direction };
    }

    const tooEarly = isFinite(t) ? t < targetSec : false;
    const tooLate = !isFinite(t) || t > targetSec;
    if (direction === 'forward') {
      if (tooEarly) a = mid;
      else if (tooLate) b = mid;
    } else {
      if (tooEarly) b = mid;
      else if (tooLate) a = mid;
    }
  }
  return { ...best, direction };
}

// ─── Beat 2 ───────────────────────────────────────────────────────────────

/**
 * cursor.baseCost controls when beat-2 fires (auto-buy purchases cursor the
 * tick `primary ≥ baseCost` first holds). Higher cost → later fire.
 *
 * Bracket: 1..400. Low end guarantees beat-2 fires at t=1 under the taper;
 * high end exceeds the click-taper cap (~48 clicks total) so beat-2 won't
 * fire at all — surfacing the "unreachable under this bot" signal as the
 * bisector hits maxIters without converging.
 */
function solveBeat2(targetSec: number): BisectResult {
  return bisect({
    lo: 1,
    hi: 400,
    targetSec,
    sampler: (value) =>
      runSingleBeat(
        {
          producers: [
            {
              id: 'cursor',
              purchase: {
                baseCost: value,
                costScaling: Number(DEFAULT_PRODUCER_DATA.balance.producerCostGrowth),
              },
            },
          ],
        },
        'beat-2',
      ),
  });
}

// ─── Orchestrator ─────────────────────────────────────────────────────────

function main(): void {
  const t0 = Date.now();

  console.log('# Producer balance solver — engine as oracle\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log('Bisects one parameter per beat against `runArcProbe` + `buildProducerSimEngine`.');
  console.log('No data files mutated. Review the proposed patch below.\n');

  // ─── Beat 2 ─────────────────────────────────────────────────────────────
  console.log('## Beat 2 — cursor.baseCost\n');
  const [beat2Lo, beat2Hi] = BEAT_WINDOWS['beat-2']!;
  const beat2Target = Math.round((beat2Lo + beat2Hi) / 2);

  const currentCursorCost = Number(
    DEFAULT_PRODUCER_DATA.producers.find((p) => p.id === 'cursor')!.purchase!.baseCost,
  );
  const currentFireTime = runSingleBeat({}, 'beat-2');

  const sol = solveBeat2(beat2Target);

  console.log(
    renderTable(
      ['field', 'value'],
      [
        ['spec window', fmtWindow([beat2Lo, beat2Hi])],
        ['target', fmt(beat2Target)],
        ['current cursor.baseCost', String(currentCursorCost)],
        ['current fire time', fmt(currentFireTime)],
        ['proposed cursor.baseCost', String(Math.round(sol.value))],
        ['proposed fire time (engine)', fmt(sol.time)],
        ['bisect direction', sol.direction],
        ['bisect iterations', String(sol.iterations)],
        ['delta from target', isFinite(sol.time) ? `${Math.round(sol.time - beat2Target)}s` : '∞'],
      ],
    ),
  );
  console.log();

  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

// ─── Rendering ────────────────────────────────────────────────────────────

function fmt(sec: number): string {
  if (!isFinite(sec)) return '∞ (never fired)';
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`;
}

function fmtWindow(w: [number, number]): string {
  return `${fmt(w[0])} – ${fmt(w[1])}`;
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

main();
