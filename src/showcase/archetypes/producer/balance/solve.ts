/**
 * Producer balance solver — methodology #1 (spec/calibrate/lock).
 *
 * Per `archetypes/BALANCING.md § Theme 3 #1`. Each beat gets bisected
 * against the bot-driven engine (`buildProducerSimEngine`) by pushing the
 * candidate value onto the archetype's tuning `OverrideRegistry` and
 * running `runUntil` against a shared engine. One engine per solve-pass —
 * bisection iterations reset state via `saveManager.importSave(initialBlob)`
 * instead of rebuilding. The engine plays the game; the solver tunes a
 * parameter until the beat's fire time lands on target.
 *
 * Run: `pnpm exec vite-node src/archetypes/producer/balance/solve.ts`.
 * Prints a proposed-patch report. Does NOT mutate data files.
 *
 * Scope: beats 2, 3, 4, 7. Proposals chain forward — each beat solves against
 * the prior beats' proposed values so later numbers account for earlier
 * tuning. Beats 5, 6, 8 deferred pending design decisions (see ticket).
 *
 * TODO(expansion): bisect against `predict.ts` `arcWaypoints` (closed-form
 * predictor) instead of `runUntil` (sim) per sample, once `verify.ts` shows
 * predictor and sim agree within tolerance. Per BALANCING.md § Theme 3 #2
 * "Bridge to #1": the predictor is methodology #1's bisection inner loop
 * when the spec admits one; sim runs only at the verify step. Refactor is
 * order-of-magnitude faster but changes solver behavior; wants its own
 * ticket.
 */

import {
  bisectTuner,
  runUntil,
  type DecimalSource,
  type Engine,
  type OverrideRegistry,
  type TunerResult,
} from '@open-loop/engine';
import { ProducerTuningRegistryKey, type ProducerTunables } from '../modules/producers';
import { PRODUCERS } from '../data/producers';
import { ARC_BEATS, BEAT_WINDOWS } from './balance';
import { buildProducerSimEngine } from './bot';

const BUDGET_SEC = BEAT_WINDOWS['beat-7']![1] * 2.5;

// Mirror the tunable() defaults declared at the reader sites
// (`modules/upgrades.ts`, `modules/milestones.ts`). Used as the "current"
// baseline for solver-proposed deltas — overwritten in the proposal map
// once a beat solves.
const TIERED_UPGRADE_MULTIPLIER_DEFAULT = 2;
const MILESTONE_BONUS_PER_TIER_DEFAULT = 1.1;

// ─── Proposal state ──────────────────────────────────────────────────────
//
// Accumulated per-beat proposals. Re-pushed as part of every sampler's
// scope so later beats see earlier beats' solutions. When a sampler
// bisects a new candidate for its own beat, that key overwrites the
// accumulated value inside the single per-sample scope.

type Proposed = Partial<Record<keyof ProducerTunables, DecimalSource>>;

function toScope(p: Proposed): Partial<ProducerTunables> {
  const scope: Partial<ProducerTunables> = {};
  for (const [key, value] of Object.entries(p) as Array<[keyof ProducerTunables, DecimalSource]>) {
    scope[key] = () => value;
  }
  return scope;
}

// ─── Sampler ─────────────────────────────────────────────────────────────

interface SamplerContext {
  engine: Engine;
  registry: OverrideRegistry<ProducerTunables>;
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
  candidateKey: keyof ProducerTunables,
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
 * cursor.baseCost controls when beat-2 fires. Bracket 1..400: low end
 * guarantees beat-2 fires at t=1 under the taper; high end exceeds the
 * click-taper cap so beat-2 won't fire — surfacing "unreachable" as the
 * bisector hits maxIters without converging.
 */
function solveBeat2(ctx: SamplerContext, targetSec: number): TunerResult {
  return bisectTuner({
    lo: 1,
    hi: 400,
    targetSec,
    sampler: (v) => sampleBeat(ctx, 'beat-2', 'producers/cursor/purchase/baseCost', v),
  });
}

/**
 * grandma.baseCost controls beat-3. Bracket wider than beat-2's — cursor
 * income builds into the window, so 5–10min affordability spans a broader
 * cost range.
 */
function solveBeat3(ctx: SamplerContext, targetSec: number): TunerResult {
  return bisectTuner({
    lo: 20,
    hi: 5000,
    targetSec,
    sampler: (v) => sampleBeat(ctx, 'beat-3', 'producers/grandma/purchase/baseCost', v),
  });
}

/**
 * Beat-4 fires on `cursor-boost-i` purchased. The tier-1 upgrade multiplier
 * drives all `*-boost-i` costs together via
 * `balance/tieredUpgradeMultiplier` — one tunable key, module-side cost
 * derivation does the fan-out (`modules/upgrades.ts resolveUpgradeCost`).
 */
function solveBeat4(ctx: SamplerContext, targetSec: number): TunerResult {
  return bisectTuner({
    lo: 1,
    hi: 500,
    targetSec,
    sampler: (v) => sampleBeat(ctx, 'beat-4', 'balance/tieredUpgradeMultiplier', v),
  });
}

/**
 * Beat-7 fires when top-owned producer's rateChain compounds to ≥1e6× base.
 * `milestoneBonusPerTier` is inverted — higher bonus → faster rate ramp →
 * earlier fire. Auto-direction detection in `bisectTuner` handles this.
 */
function solveBeat7(ctx: SamplerContext, targetSec: number): TunerResult {
  return bisectTuner({
    lo: 1.1,
    hi: 10,
    targetSec,
    sampler: (v) => sampleBeat(ctx, 'beat-7', 'balance/milestoneBonusPerTier', v),
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

function currentProducerBaseCost(id: string): number {
  return Number(PRODUCERS.find((p) => p.id === id)!.purchase!.baseCost);
}

/**
 * One Gauss-Seidel pass: solve beats 2, 3, 4, 7 in order against the current
 * proposal. Called in an outer loop to converge coupling between beats.
 * Same Gauss-Seidel shape as the previous iteration; the difference is that
 * each beat's sampler reads the accumulated proposal via a single scope-push
 * per iteration instead of rebuilding the engine with a merged overrides object.
 */
function solvePass(proposed: Proposed): {
  proposed: Proposed;
  solves: BeatSolve[];
} {
  const engine = buildProducerSimEngine();
  const registry = engine.tryInject(ProducerTuningRegistryKey)!;
  const initialBlob = engine.saveManager!.exportSave();
  const ctx: SamplerContext = { engine, registry, initialBlob, proposed };

  const solves: BeatSolve[] = [];

  // Beat 2 — cursor.baseCost
  {
    const [lo, hi] = BEAT_WINDOWS['beat-2']!;
    const target = (lo + hi) / 2;
    const currentFire = sampleBeat(
      ctx,
      'beat-2',
      'producers/cursor/purchase/baseCost',
      Number(proposed['producers/cursor/purchase/baseCost'] ?? currentProducerBaseCost('cursor')),
    );
    const sol = solveBeat2(ctx, target);
    const value = Math.round(sol.value);
    ctx.proposed['producers/cursor/purchase/baseCost'] = value;
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
    const currentFire = sampleBeat(
      ctx,
      'beat-3',
      'producers/grandma/purchase/baseCost',
      Number(proposed['producers/grandma/purchase/baseCost'] ?? currentProducerBaseCost('grandma')),
    );
    const sol = solveBeat3(ctx, target);
    const value = Math.round(sol.value);
    ctx.proposed['producers/grandma/purchase/baseCost'] = value;
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

  // Beat 4 — tier-1 upgrade multiplier
  {
    const [lo, hi] = BEAT_WINDOWS['beat-4']!;
    const target = (lo + hi) / 2;
    const currentFire = sampleBeat(
      ctx,
      'beat-4',
      'balance/tieredUpgradeMultiplier',
      Number(proposed['balance/tieredUpgradeMultiplier'] ?? TIERED_UPGRADE_MULTIPLIER_DEFAULT),
    );
    const sol = solveBeat4(ctx, target);
    const value = Math.round(sol.value);
    ctx.proposed['balance/tieredUpgradeMultiplier'] = value;
    solves.push({
      beatId: 'beat-4',
      field: 'tier-i multiplier',
      current: TIERED_UPGRADE_MULTIPLIER_DEFAULT,
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
    const currentFire = sampleBeat(
      ctx,
      'beat-7',
      'balance/milestoneBonusPerTier',
      Number(proposed['balance/milestoneBonusPerTier'] ?? MILESTONE_BONUS_PER_TIER_DEFAULT),
    );
    const sol = solveBeat7(ctx, target);
    const value = round3(sol.value);
    ctx.proposed['balance/milestoneBonusPerTier'] = value;
    solves.push({
      beatId: 'beat-7',
      field: 'milestoneBonusPerTier',
      current: MILESTONE_BONUS_PER_TIER_DEFAULT,
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

const PASSES = 3;

function main(): void {
  const t0 = Date.now();

  console.log('# Producer balance solver — engine as oracle\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log('Bisects one parameter per beat against `runUntil` + `buildProducerSimEngine`');
  console.log('under a shared engine reset via `saveManager.importSave` per sample.');
  console.log(`Gauss-Seidel outer loop (${PASSES} passes) converges beat coupling.`);
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
  const verifyEngine = buildProducerSimEngine();
  const verifyRegistry = verifyEngine.tryInject(ProducerTuningRegistryKey)!;
  const verifyBlob = verifyEngine.saveManager!.exportSave();
  const verifyCtx: SamplerContext = {
    engine: verifyEngine,
    registry: verifyRegistry,
    initialBlob: verifyBlob,
    proposed,
  };
  const verified = verifyAll(verifyCtx, [
    'beat-2',
    'beat-3',
    'beat-4',
    'beat-5',
    'beat-6',
    'beat-7',
  ]);
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
