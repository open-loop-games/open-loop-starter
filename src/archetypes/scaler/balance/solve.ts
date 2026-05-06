/**
 * Scaler balance solver — methodology #1 (spec/calibrate/lock).
 *
 * Per `archetypes/BALANCING.md § Theme 3 #1`. Each beat gets bisected
 * against the autobuyer-driven engine (`buildScalerSimEngine`) by pushing
 * the candidate value onto the archetype's tuning `OverrideRegistry` and
 * running `runUntil` against a shared engine. One engine per solve-pass —
 * bisection iterations reset state via `saveManager.importSave(initialBlob)`
 * instead of rebuilding. The engine plays the game; the solver tunes a
 * declared-invention parameter until the beat's fire-time lands on target.
 *
 * Run: `pnpm exec vite-node src/archetypes/scaler/balance/solve.ts`.
 * Prints a proposed-patch report. Does NOT mutate data files.
 *
 * Sub-leaf C scope: **antimatter only** — beats 1-2. Beat-1 (first Worker
 * bought) lands at ~1s under the autobuyer-driven sim by construction
 * (cost 100 < 1e2 bootstrap, autobuyer interval 1s); beat-2 (first
 * antimatter upgrade bought) is the calibration target. Per
 * `balance/shape.ts` SCALER_SUBSYSTEMS antimatter inventionKnobs, the
 * declared-invention surface is `balance/achievementMultiplier` and
 * `modules/antimatter/UPGRADE_PER_LEVEL_MULT/accelerator`. Sub-leaves
 * D / E own beats 3-5 / 6-8.
 *
 * Adopts producer's pushScope/importSave bisection pattern over the new
 * `ScalerTuningRegistryKey`. Mirrors producer/balance/solve.ts shape so
 * sub-leaves D/E plug in their per-subsystem solvers without re-deriving
 * the shared scaffolding.
 */

import {
  bisectTuner,
  runUntil,
  type DecimalSource,
  type Engine,
  type OverrideRegistry,
  type TunerResult,
} from 'open-loop-engine';
import { ScalerTuningRegistryKey, type ScalerTunables } from '../modules/tuning';
import { DEFAULT_SCALER_DATA } from '../data';
import { ARC_BEATS, BEAT_WINDOWS } from './beats';
import { buildScalerSimEngine } from './bot';

const BUDGET_SEC = BEAT_WINDOWS['beat-8']![1] * 2.5;

// ─── Proposal state ──────────────────────────────────────────────────────
//
// Accumulated per-beat proposals. Re-pushed as part of every sampler's
// scope so later beats see earlier beats' solutions. When a sampler
// bisects a new candidate for its own beat, that key overwrites the
// accumulated value inside the single per-sample scope.

type Proposed = Partial<Record<keyof ScalerTunables, DecimalSource>>;

function toScope(p: Proposed): Partial<ScalerTunables> {
  const scope: Partial<ScalerTunables> = {};
  for (const [key, value] of Object.entries(p) as Array<[keyof ScalerTunables, DecimalSource]>) {
    scope[key] = () => value;
  }
  return scope;
}

// ─── Sampler ─────────────────────────────────────────────────────────────

interface SamplerContext {
  engine: Engine;
  registry: OverrideRegistry<ScalerTunables>;
  initialBlob: string;
  proposed: Proposed;
}

/**
 * Sample a beat's fire-time under the current accumulated proposal plus a
 * single candidate override. Resets engine state via `importSave`, pushes
 * `{...proposed, [candidateKey]: candidate}` as one scope, runs `runUntil`,
 * and tears the scope down in a `finally` so scope leaks don't silently
 * contaminate the next iteration.
 */
function sampleBeat(
  ctx: SamplerContext,
  beatId: string,
  candidateKey: keyof ScalerTunables,
  candidateValue: number,
): number {
  const beat = ARC_BEATS.find((b) => b.id === beatId);
  if (!beat) throw new Error(`no beat ${beatId} in ARC_BEATS`);

  const result = ctx.engine.saveManager!.importSave(ctx.initialBlob);
  if (!result.success) throw new Error(`importSave failed for beat ${beatId}`);

  const cleanup = ctx.registry.pushScope(`solver:${beatId}`, {
    ...toScope(ctx.proposed),
    [candidateKey]: () => candidateValue,
  });

  let fireTime: number;
  try {
    const { terminated, elapsedSimulated } = runUntil({
      engine: ctx.engine,
      until: () => beat.predicate(ctx.engine),
      maxSimTime: BUDGET_SEC,
      tickDelta: 1,
    });
    fireTime = terminated === 'predicate' ? elapsedSimulated : Infinity;
  } finally {
    cleanup();
  }
  if (ctx.registry.scopeDepth !== 0) {
    throw new Error(`scope leak after ${beatId} sampler: depth=${ctx.registry.scopeDepth}`);
  }
  return fireTime;
}

// ─── Per-beat solvers ─────────────────────────────────────────────────────

/**
 * Beat-2 fires when the autobuyer's upgrade sweep grabs Accelerator (cost
 * 500 — vanilla canonical from Synergism Reset.ts:432, off-limits) or
 * Multiplier (cost 1e4 — same). Under the autobuyer-driven sim the
 * producer auto-buy drains coins on a 1s interval; the upgrade sweep
 * grabs whatever spike the producer auto-buy hasn't drained yet. Beat-2
 * fire-time is therefore set by the headline coin rate — high enough rate
 * means coins spike past 500 between producer-buy ticks faster than they
 * drain, letting Accelerator land in window.
 *
 * `balance/achievementMultiplier` is the declared-invention rate lever:
 * each fired antimatter milestone (count ≥ 1, 5, 25) compounds onto the
 * antimatter rate chain via `getCombinedAchievementEffect` (modules/
 * achievements.ts). Bracket 1.02..50 covers the canonical default through
 * an aggressively boosted slim-port shape; auto-direction handles the
 * inverted relationship (higher mult → faster fire).
 */
function solveBeat2(ctx: SamplerContext, targetSec: number): TunerResult {
  return bisectTuner({
    lo: 1.02,
    hi: 50,
    targetSec,
    sampler: (v) => sampleBeat(ctx, 'beat-2', 'balance/achievementMultiplier', v),
  });
}

// ─── Verification ─────────────────────────────────────────────────────────

interface VerifyRow {
  beatId: string;
  window: [number, number];
  firedAt: number;
  inWindow: boolean;
}

function verifyAll(ctx: SamplerContext, beats: readonly string[]): VerifyRow[] {
  return beats.map((beatId) => {
    const window = BEAT_WINDOWS[beatId]!;
    const beat = ARC_BEATS.find((b) => b.id === beatId)!;
    const result = ctx.engine.saveManager!.importSave(ctx.initialBlob);
    if (!result.success) throw new Error(`importSave failed for verify ${beatId}`);
    const cleanup = ctx.registry.pushScope(`verify:${beatId}`, toScope(ctx.proposed));
    try {
      const { terminated, elapsedSimulated } = runUntil({
        engine: ctx.engine,
        until: () => beat.predicate(ctx.engine),
        maxSimTime: BUDGET_SEC,
        tickDelta: 1,
      });
      const firedAt = terminated === 'predicate' ? elapsedSimulated : Infinity;
      return {
        beatId,
        window,
        firedAt,
        inWindow: isFinite(firedAt) && firedAt >= window[0] && firedAt <= window[1],
      };
    } finally {
      cleanup();
    }
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

/**
 * One Gauss-Seidel pass: solve beats in order against the current
 * proposal. Single beat at sub-leaf C (beat-2 — beat-1 fires in window
 * by construction). D / E extend with their per-subsystem solvers
 * against the same scaffolding.
 */
function solvePass(proposed: Proposed): { proposed: Proposed; solves: BeatSolve[] } {
  const engine = buildScalerSimEngine();
  const registry = engine.tryInject(ScalerTuningRegistryKey)!;
  const initialBlob = engine.saveManager!.exportSave();
  const ctx: SamplerContext = { engine, registry, initialBlob, proposed };

  const solves: BeatSolve[] = [];

  // Beat 2 — achievementMultiplier (rate lever)
  {
    const [lo, hi] = BEAT_WINDOWS['beat-2']!;
    const target = (lo + hi) / 2;
    const currentMult = Number(
      proposed['balance/achievementMultiplier'] ??
        DEFAULT_SCALER_DATA.balance.achievementMultiplier,
    );
    const currentFire = sampleBeat(ctx, 'beat-2', 'balance/achievementMultiplier', currentMult);
    const sol = solveBeat2(ctx, target);
    const value = round3(sol.value);
    ctx.proposed['balance/achievementMultiplier'] = value;
    solves.push({
      beatId: 'beat-2',
      field: 'achievementMultiplier',
      current: Number(DEFAULT_SCALER_DATA.balance.achievementMultiplier),
      currentFireTime: currentFire,
      proposed: value,
      proposedFireTime: sol.time,
      direction: sol.direction,
      iterations: sol.iterations,
      window: [lo, hi],
    });
  }

  return { proposed: ctx.proposed, solves };
}

const PASSES = 1;

function main(): void {
  const t0 = Date.now();

  console.log('# Scaler balance solver — engine as oracle (sub-leaf C — antimatter)\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log('Bisects declared-invention knobs against `runUntil` + autobuyer-driven sim.');
  console.log('Beat-1 (Worker bought) lands at ~1s by construction; beat-2 is the target.');
  console.log(`Gauss-Seidel outer loop (${PASSES} pass — single-knob target).`);
  console.log('No data files mutated. Review below.\n');

  let proposed: Proposed = {};

  for (let pass = 1; pass <= PASSES; pass++) {
    const result = solvePass(proposed);
    proposed = result.proposed;
    console.log(`## Pass ${pass}\n`);
    console.log(
      renderTable(
        ['beat', 'field', 'window', 'current', 'currT', 'proposed', 'propT', 'dir', 'it'],
        result.solves.map((s) => [
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
  }

  // ─── Verification ───────────────────────────────────────────────────────
  console.log('## Verification — all proposals applied together\n');
  const verifyEngine = buildScalerSimEngine();
  const verifyRegistry = verifyEngine.tryInject(ScalerTuningRegistryKey)!;
  const verifyBlob = verifyEngine.saveManager!.exportSave();
  const verifyCtx: SamplerContext = {
    engine: verifyEngine,
    registry: verifyRegistry,
    initialBlob: verifyBlob,
    proposed,
  };
  // Verify sub-leaf C's targets only (beats 1-2). Beats 3-8 covered by D/E.
  const verified = verifyAll(verifyCtx, ['beat-1', 'beat-2']);
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
      `${offTarget.length}/${verified.length} beat(s) drift out-of-window under combined overrides.`,
    );
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
