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
 * Scope: beats 2, 3, 4, 7. Proposals chain forward — each beat solves against
 * the prior beats' proposed values so later numbers account for earlier
 * tuning. Beats 5, 6, 8 deferred pending design decisions (see ticket).
 */

import { runArcProbe } from '@/balance';
import type { ProducerOverrides } from '..';
import { DEFAULT_PRODUCER_DATA } from '../data';
import { PRODUCERS } from '../data/producers';
import { ARC_BEATS, BEAT_WINDOWS } from './beats';
import { buildProducerSimEngine } from './bot';

const BUDGET_SEC = BEAT_WINDOWS['beat-8']![1] * 2.5;
const COST_SCALING = Number(DEFAULT_PRODUCER_DATA.balance.producerCostGrowth);

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

// ─── Override composition ────────────────────────────────────────────────

/**
 * Merge a producer purchase override into `proposed`, preserving prior entries.
 * Writes both baseCost + costScaling so the override merge sees a complete
 * `purchase` block (shallow merge by id doesn't recurse into nested fields).
 */
function withProducerCost(
  proposed: ProducerOverrides,
  id: string,
  baseCost: number,
): ProducerOverrides {
  const producers = [...(proposed.producers ?? [])];
  const patch = { id, purchase: { baseCost, costScaling: COST_SCALING } };
  const existing = producers.findIndex((p) => p.id === id);
  if (existing >= 0) producers[existing] = patch;
  else producers.push(patch);
  return { ...proposed, producers };
}

/**
 * Rewrite all tier-i upgrade costs given a candidate multiplier M. Each cost
 * is computed from the proposed producer baseCost (so beat-4 respects earlier
 * beat-2/3 proposals). Replaces every `*-boost-i` entry in `proposed.upgrades`.
 *
 * The data file derives tier-i costs from `producer.baseCost × 20` today; this
 * helper is the solver's knob on the shared multiplier, not on individual rows.
 */
function withTier1UpgradeMultiplier(
  proposed: ProducerOverrides,
  multiplier: number,
): ProducerOverrides {
  const producerCostFor = (id: string): number => {
    const overridden = proposed.producers?.find((p) => p.id === id)?.purchase?.baseCost;
    if (overridden !== undefined) return Number(overridden);
    return Number(PRODUCERS.find((p) => p.id === id)!.purchase!.baseCost);
  };

  const patches = PRODUCERS.filter((p) => p.trigger === 'continuous' && p.purchase).map((p) => ({
    id: `${p.id}-boost-i`,
    cost: producerCostFor(p.id) * multiplier,
  }));

  const upgrades = [
    ...(proposed.upgrades ?? []).filter((u) => !u.id.endsWith('-boost-i')),
    ...patches,
  ];
  return { ...proposed, upgrades };
}

function withBalance(
  proposed: ProducerOverrides,
  patch: Partial<typeof DEFAULT_PRODUCER_DATA.balance>,
): ProducerOverrides {
  return { ...proposed, balance: { ...proposed.balance, ...patch } };
}

// ─── Per-beat solvers ─────────────────────────────────────────────────────

/**
 * cursor.baseCost controls when beat-2 fires (auto-buy purchases cursor the
 * tick `primary ≥ baseCost` first holds). Higher cost → later fire.
 *
 * Bracket: 1..400. Low end guarantees beat-2 fires at t=1 under the taper;
 * high end exceeds the click-taper cap (~48 clicks total) so beat-2 won't
 * fire at all — surfacing the "unreachable under this bot" signal as the
 * bisector hits maxIters without converging.
 */
function solveBeat2(proposed: ProducerOverrides, targetSec: number): BisectResult {
  return bisect({
    lo: 1,
    hi: 400,
    targetSec,
    sampler: (value) => runSingleBeat(withProducerCost(proposed, 'cursor', value), 'beat-2'),
  });
}

/**
 * grandma.baseCost controls beat-3 given the post-beat-2 income trajectory.
 * Bracket wider than beat-2's — cursor income builds into the window, so
 * 5–10min affordability spans a broader cost range.
 */
function solveBeat3(proposed: ProducerOverrides, targetSec: number): BisectResult {
  return bisect({
    lo: 20,
    hi: 5000,
    targetSec,
    sampler: (value) => runSingleBeat(withProducerCost(proposed, 'grandma', value), 'beat-3'),
  });
}

/**
 * Beat-4 fires on `cursor-boost-i` purchased. The tier-i upgrade multiplier
 * (default 20× producer baseCost) drives *all* tier-i costs together — that
 * is the data's knob, not any individual upgrade cost. The multi-upgrade
 * perturbation helper rewrites every `*-boost-i` entry per candidate.
 */
function solveBeat4(proposed: ProducerOverrides, targetSec: number): BisectResult {
  return bisect({
    lo: 1,
    hi: 500,
    targetSec,
    sampler: (value) => runSingleBeat(withTier1UpgradeMultiplier(proposed, value), 'beat-4'),
  });
}

/**
 * Beat-7 fires when top-owned producer's rateChain compounds to ≥1e6× base.
 * `milestoneBonusPerTier` is inverted — higher bonus → faster rate ramp →
 * earlier fire. Auto-direction detection in `bisect` handles this.
 */
function solveBeat7(proposed: ProducerOverrides, targetSec: number): BisectResult {
  return bisect({
    lo: 1.1,
    hi: 10,
    targetSec,
    sampler: (value) =>
      runSingleBeat(withBalance(proposed, { milestoneBonusPerTier: value }), 'beat-7'),
  });
}

// ─── Verification ─────────────────────────────────────────────────────────

interface VerifyRow {
  beatId: string;
  window: [number, number];
  firedAt: number;
  inWindow: boolean;
}

function verifyAll(proposed: ProducerOverrides, beats: readonly string[]): VerifyRow[] {
  return beats.map((beatId) => {
    const window = BEAT_WINDOWS[beatId]!;
    const firedAt = runSingleBeat(proposed, beatId);
    return {
      beatId,
      window,
      firedAt,
      inWindow: isFinite(firedAt) && firedAt >= window[0] && firedAt <= window[1],
    };
  });
}

// ─── Orchestrator ─────────────────────────────────────────────────────────

interface BeatSolve {
  beatId: string;
  field: string;
  current: number;
  currentFireTime: number;
  proposed: number;
  proposedFireTime: number;
  direction: 'forward' | 'inverted';
  iterations: number;
  window: [number, number];
}

function currentProducerBaseCost(id: string): number {
  return Number(DEFAULT_PRODUCER_DATA.producers.find((p) => p.id === id)!.purchase!.baseCost);
}

function main(): void {
  const t0 = Date.now();

  console.log('# Producer balance solver — engine as oracle\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log('Bisects one parameter per beat against `runArcProbe` + `buildProducerSimEngine`.');
  console.log("Proposals chain — each beat solves against earlier beats' proposed values.");
  console.log('No data files mutated. Review below.\n');

  let proposed: ProducerOverrides = {};
  const solves: BeatSolve[] = [];

  // Beat 2 — cursor.baseCost
  {
    const [lo, hi] = BEAT_WINDOWS['beat-2']!;
    const target = (lo + hi) / 2;
    const currentFire = runSingleBeat(proposed, 'beat-2');
    const sol = solveBeat2(proposed, target);
    const value = Math.round(sol.value);
    proposed = withProducerCost(proposed, 'cursor', value);
    solves.push({
      beatId: 'beat-2',
      field: 'cursor.baseCost',
      current: currentProducerBaseCost('cursor'),
      currentFireTime: currentFire,
      proposed: value,
      proposedFireTime: sol.time,
      direction: sol.direction,
      iterations: sol.iterations,
      window: [lo, hi],
    });
  }

  // Beat 3 — grandma.baseCost
  {
    const [lo, hi] = BEAT_WINDOWS['beat-3']!;
    const target = (lo + hi) / 2;
    const currentFire = runSingleBeat(proposed, 'beat-3');
    const sol = solveBeat3(proposed, target);
    const value = Math.round(sol.value);
    proposed = withProducerCost(proposed, 'grandma', value);
    solves.push({
      beatId: 'beat-3',
      field: 'grandma.baseCost',
      current: currentProducerBaseCost('grandma'),
      currentFireTime: currentFire,
      proposed: value,
      proposedFireTime: sol.time,
      direction: sol.direction,
      iterations: sol.iterations,
      window: [lo, hi],
    });
  }

  // Beat 4 — tier-i upgrade multiplier
  {
    const [lo, hi] = BEAT_WINDOWS['beat-4']!;
    const target = (lo + hi) / 2;
    const currentFire = runSingleBeat(proposed, 'beat-4');
    const sol = solveBeat4(proposed, target);
    const value = Math.round(sol.value);
    proposed = withTier1UpgradeMultiplier(proposed, value);
    solves.push({
      beatId: 'beat-4',
      field: 'tier-i multiplier',
      current: 20, // current data value; PER_PRODUCER_TIERS[0].multiplier in upgrades.ts
      currentFireTime: currentFire,
      proposed: value,
      proposedFireTime: sol.time,
      direction: sol.direction,
      iterations: sol.iterations,
      window: [lo, hi],
    });
  }

  // Beat 7 — milestoneBonusPerTier (inverted)
  {
    const [lo, hi] = BEAT_WINDOWS['beat-7']!;
    const target = (lo + hi) / 2;
    const currentFire = runSingleBeat(proposed, 'beat-7');
    const sol = solveBeat7(proposed, target);
    const value = round3(sol.value);
    proposed = withBalance(proposed, { milestoneBonusPerTier: value });
    solves.push({
      beatId: 'beat-7',
      field: 'milestoneBonusPerTier',
      current: Number(DEFAULT_PRODUCER_DATA.balance.milestoneBonusPerTier),
      currentFireTime: currentFire,
      proposed: value,
      proposedFireTime: sol.time,
      direction: sol.direction,
      iterations: sol.iterations,
      window: [lo, hi],
    });
  }

  // ─── Report ─────────────────────────────────────────────────────────────
  console.log('## Per-beat solves\n');
  console.log(
    renderTable(
      ['beat', 'field', 'window', 'current', 'currT', 'proposed', 'propT', 'dir', 'it'],
      solves.map((s) => [
        s.beatId,
        s.field,
        fmtWindow(s.window),
        String(s.current),
        fmt(s.currentFireTime),
        String(s.proposed),
        fmt(s.proposedFireTime),
        s.direction,
        String(s.iterations),
      ]),
    ),
  );
  console.log();

  // ─── Verification ───────────────────────────────────────────────────────
  console.log('## Verification — all proposals applied together\n');
  const verified = verifyAll(proposed, ['beat-2', 'beat-3', 'beat-4', 'beat-7']);
  console.log(
    renderTable(
      ['beat', 'window', 'fired at', 'in window'],
      verified.map((v) => [
        v.beatId,
        fmtWindow(v.window),
        fmt(v.firedAt),
        v.inWindow ? 'yes' : 'NO',
      ]),
    ),
  );
  console.log();

  const offTarget = verified.filter((v) => !v.inWindow);
  if (offTarget.length > 0) {
    console.log(
      `Coupling: ${offTarget.length} beat(s) drift out-of-window under combined overrides.`,
    );
    console.log('This is the Gauss-Seidel re-pass signal — wire an outer loop if it persists.\n');
  }

  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

// ─── Rendering ────────────────────────────────────────────────────────────

function fmt(sec: number): string {
  if (!isFinite(sec)) return '∞ (never)';
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`;
}

function fmtWindow(w: [number, number]): string {
  return `${fmt(w[0])}–${fmt(w[1])}`;
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

main();
