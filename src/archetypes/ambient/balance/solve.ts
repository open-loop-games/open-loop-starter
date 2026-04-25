/**
 * Ambient balance solver — engine as oracle.
 *
 * Each beat gets bisected against the bot-driven engine
 * (`buildAmbientSimEngine`) by pushing the candidate value onto the
 * archetype's tuning `OverrideRegistry` and running `runUntil`. One engine
 * per solve-pass — bisection iterations reset state via
 * `saveManager.importSave(initialBlob)` instead of rebuilding.
 *
 * Run: `pnpm balance:solve:ambient`. Prints a proposed-patch report. Does
 * NOT mutate data files — the human picks and edits scaffolding based on
 * the output, per `archetypes/BALANCING.md`.
 *
 * Scope: beats 2, 3, 5, 7. Beats 1, 4, 6 are verify-only:
 *   - Beat 1 ("first passive production") fires on planter's seeded
 *     `initialAmount: 1` producing primary ≥ 1 in seconds. No knob to bisect
 *     against under default content.
 *   - Beat 4 ("glance-check value proposition") is resume-driven and not
 *     testable in continuous headless sim. Runtime verification only.
 *   - Beat 6 ("first low-urgency achievement multiplier") rides the
 *     production curve set by B2/B3/B5 + content cardinality. Verified
 *     after combined overrides; if it falls outside its window, decision is
 *     content-reshape (add achievements or shift their thresholds), not a
 *     dedicated knob — same precedent as Producer's B5 in OL-625.
 *
 * Proposals chain forward — each beat solves against the prior beats'
 * proposed values via a single scope-push per sample. Mirrors
 * producer/balance/solve.ts shape.
 */

import {
  bisectTuner,
  runUntil,
  type DecimalSource,
  type Engine,
  type OverrideRegistry,
  type TunerResult,
} from 'open-loop-engine';
import { AmbientTuningRegistryKey, type AmbientTunables } from '../modules';
import { AUTO_PRODUCERS } from '../data/producers';
import { UNLOCKS } from '../data/unlocks';
import { ARC_BEATS, BEAT_WINDOWS } from './beats';
import { buildAmbientSimEngine } from './bot';

const BUDGET_SEC = BEAT_WINDOWS['beat-7']![1] * 2.5;

// ─── Proposal state ──────────────────────────────────────────────────────

type Proposed = Partial<Record<keyof AmbientTunables, DecimalSource>>;

function toScope(p: Proposed): Partial<AmbientTunables> {
  const scope: Partial<AmbientTunables> = {};
  for (const [key, value] of Object.entries(p) as Array<[keyof AmbientTunables, DecimalSource]>) {
    scope[key] = () => value;
  }
  return scope;
}

// ─── Sampler ─────────────────────────────────────────────────────────────

interface SamplerContext {
  engine: Engine;
  registry: OverrideRegistry<AmbientTunables>;
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
  candidateKey: keyof AmbientTunables,
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

// ─── Per-beat solvers ────────────────────────────────────────────────────

/**
 * planter.baseCost controls when beat-2 fires. Default 10 → fires at t≈20s
 * (planter rate 0.5/s × initialAmount=1 → primary=10 at t=20s). Need to
 * raise cost so the second planter unit isn't payable until ~120s.
 * Bracket [10, 5000]: low end is current default; high end exceeds any
 * sane onboarding cost — surfacing "unreachable" as a 22-iter no-converge
 * is the right signal at the upper bound.
 */
function solveBeat2(ctx: SamplerContext, targetSec: number): TunerResult {
  return bisectTuner({
    lo: 10,
    hi: 5_000,
    targetSec,
    sampler: (v) => sampleBeat(ctx, 'beat-2', 'producers/planter/purchase/baseCost', v),
  });
}

/**
 * coop-built unlock threshold controls beat-3. Default 30 → lifetime crosses
 * fast (t≈60s under default planter rate). Need threshold ~hundreds-to-low-
 * thousands so fire lands in 30–90min window. Bracket wide: [30, 5e7] —
 * accumulation-rate growth with coop ownership makes the curve nonlinear.
 */
function solveBeat3(ctx: SamplerContext, targetSec: number): TunerResult {
  return bisectTuner({
    lo: 30,
    hi: 5e7,
    targetSec,
    sampler: (v) => sampleBeat(ctx, 'beat-3', 'unlocks/coop-built/threshold', v),
  });
}

/**
 * spring-arrives unlock threshold controls beat-5 (paired with pond
 * ownership; pond is affordable well before the 3–5h window under any
 * sane balance, so spring-arrives is the gating term). Default 5000 →
 * fires fast under current rates. Bracket [5e3, 1e11] — late-arc rates can
 * accumulate huge lifetimes per second, so widen the upper bound.
 */
function solveBeat5(ctx: SamplerContext, targetSec: number): TunerResult {
  return bisectTuner({
    lo: 5e3,
    hi: 1e11,
    targetSec,
    sampler: (v) => sampleBeat(ctx, 'beat-5', 'unlocks/spring-arrives/threshold', v),
  });
}

/**
 * year-cycles unlock threshold controls beat-7. The arc-close predicate
 * gates on BOTH `primary >= prestigeEligibleThreshold` AND `year-cycles`
 * unlock bought (lifetime >= year-cycles.threshold). With B2/B3/B5 applied,
 * year-cycles is the binding term — primary current value crosses
 * prestigeEligibleThreshold (default 1e6) well before lifetime reaches the
 * year-cycles threshold under any sensible balance. So the solver bisects
 * year-cycles directly; prestigeEligibleThreshold stays at its hand-picked
 * default and the gate it controls is dominated by year-cycles.
 *
 * If a future Ambient design wants prestigeEligibleThreshold to be the
 * binding term, swap year-cycles to a low fixed value and bisect prestige
 * here instead. The framing is "whichever fires last, that's the variable."
 *
 * Bracket [5e6, 5e10] — lifetime accumulates fast at late-arc rates with
 * pasture/orchard owned, so the upper bound exceeds any sane window.
 */
function solveBeat7(ctx: SamplerContext, targetSec: number): TunerResult {
  return bisectTuner({
    lo: 5e6,
    hi: 5e10,
    targetSec,
    sampler: (v) => sampleBeat(ctx, 'beat-7', 'unlocks/year-cycles/threshold', v),
  });
}

// ─── Verification ────────────────────────────────────────────────────────

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

// ─── Orchestrator ────────────────────────────────────────────────────────

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
  return Number(AUTO_PRODUCERS.find((p) => p.id === id)!.purchase.baseCost);
}

function currentUnlockThreshold(id: string): number {
  return Number(UNLOCKS.find((u) => u.id === id)!.threshold);
}

// Solver ramp-up gate. Step up one beat at a time per OL-697 session-2
// methodology — never run the full multi-beat × multi-pass sweep on the
// first try. Toggle this and PASSES below as the ramp progresses.
const ENABLED_BEATS = new Set<string>(['beat-2', 'beat-3', 'beat-5', 'beat-7']);

function solvePass(proposed: Proposed): {
  proposed: Proposed;
  solves: BeatSolve[];
} {
  const engine = buildAmbientSimEngine();
  const registry = engine.tryInject(AmbientTuningRegistryKey)!;
  const initialBlob = engine.saveManager!.exportSave();
  const ctx: SamplerContext = { engine, registry, initialBlob, proposed };

  const solves: BeatSolve[] = [];

  // Beat 2 — planter.baseCost
  if (ENABLED_BEATS.has('beat-2')) {
    const [lo, hi] = BEAT_WINDOWS['beat-2']!;
    const target = (lo + hi) / 2;
    const currentFire = sampleBeat(
      ctx,
      'beat-2',
      'producers/planter/purchase/baseCost',
      Number(proposed['producers/planter/purchase/baseCost'] ?? currentProducerBaseCost('planter')),
    );
    const sol = solveBeat2(ctx, target);
    const value = Math.round(sol.value);
    ctx.proposed['producers/planter/purchase/baseCost'] = value;
    solves.push({
      beatId: 'beat-2',
      field: 'planter.baseCost',
      current: currentProducerBaseCost('planter'),
      currentFireTime: currentFire,
      proposed: value,
      proposedFireTime: sol.time,
      direction: sol.direction,
      iterations: sol.iterations,
      window: [lo, hi],
    });
  }

  // Beat 3 — coop-built threshold
  if (ENABLED_BEATS.has('beat-3')) {
    const [lo, hi] = BEAT_WINDOWS['beat-3']!;
    const target = (lo + hi) / 2;
    const currentFire = sampleBeat(
      ctx,
      'beat-3',
      'unlocks/coop-built/threshold',
      Number(proposed['unlocks/coop-built/threshold'] ?? currentUnlockThreshold('coop-built')),
    );
    const sol = solveBeat3(ctx, target);
    const value = Math.round(sol.value);
    ctx.proposed['unlocks/coop-built/threshold'] = value;
    solves.push({
      beatId: 'beat-3',
      field: 'coop-built.threshold',
      current: currentUnlockThreshold('coop-built'),
      currentFireTime: currentFire,
      proposed: value,
      proposedFireTime: sol.time,
      direction: sol.direction,
      iterations: sol.iterations,
      window: [lo, hi],
    });
  }

  // Beat 5 — spring-arrives threshold
  if (ENABLED_BEATS.has('beat-5')) {
    const [lo, hi] = BEAT_WINDOWS['beat-5']!;
    const target = (lo + hi) / 2;
    const currentFire = sampleBeat(
      ctx,
      'beat-5',
      'unlocks/spring-arrives/threshold',
      Number(
        proposed['unlocks/spring-arrives/threshold'] ?? currentUnlockThreshold('spring-arrives'),
      ),
    );
    const sol = solveBeat5(ctx, target);
    const value = Math.round(sol.value);
    ctx.proposed['unlocks/spring-arrives/threshold'] = value;
    solves.push({
      beatId: 'beat-5',
      field: 'spring-arrives.threshold',
      current: currentUnlockThreshold('spring-arrives'),
      currentFireTime: currentFire,
      proposed: value,
      proposedFireTime: sol.time,
      direction: sol.direction,
      iterations: sol.iterations,
      window: [lo, hi],
    });
  }

  // Beat 7 — year-cycles unlock threshold (the binding term)
  if (ENABLED_BEATS.has('beat-7')) {
    const [lo, hi] = BEAT_WINDOWS['beat-7']!;
    const target = (lo + hi) / 2;
    const currentFire = sampleBeat(
      ctx,
      'beat-7',
      'unlocks/year-cycles/threshold',
      Number(proposed['unlocks/year-cycles/threshold'] ?? currentUnlockThreshold('year-cycles')),
    );
    const sol = solveBeat7(ctx, target);
    const value = Math.round(sol.value);
    ctx.proposed['unlocks/year-cycles/threshold'] = value;
    solves.push({
      beatId: 'beat-7',
      field: 'year-cycles.threshold',
      current: currentUnlockThreshold('year-cycles'),
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

  console.log('# Ambient balance solver — engine as oracle\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log('Bisects one parameter per beat against `runUntil` + `buildAmbientSimEngine`');
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
          fmtNum(s.current),
          fmt(s.currentFireTime),
          fmtNum(s.proposed),
          fmt(s.proposedFireTime),
          s.direction,
          String(s.iterations),
        ]),
      ),
    );
    console.log();
  }

  // ─── Verification (all beats) ──────────────────────────────────────────
  console.log('## Verification — all proposals applied together\n');
  const verifyEngine = buildAmbientSimEngine();
  const verifyRegistry = verifyEngine.tryInject(AmbientTuningRegistryKey)!;
  const verifyBlob = verifyEngine.saveManager!.exportSave();
  const verifyCtx: SamplerContext = {
    engine: verifyEngine,
    registry: verifyRegistry,
    initialBlob: verifyBlob,
    proposed,
  };
  const verifyBeats = ['beat-1', 'beat-2', 'beat-3', 'beat-5', 'beat-6', 'beat-7'].filter(
    (b) => b === 'beat-1' || b === 'beat-6' || ENABLED_BEATS.has(b),
  );
  const verified = verifyAll(verifyCtx, verifyBeats);
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
    console.log('Beats 1 and 6 are verify-only — drift there is a content-reshape signal');
    console.log('(beat-1: planter initialAmount; beat-6: achievement count/threshold density).\n');
  }

  console.log('## Apply patch — exact integer values\n');
  for (const [key, value] of Object.entries(proposed) as Array<
    [keyof AmbientTunables, DecimalSource]
  >) {
    console.log(`  ${key} = ${fmtExact(Number(value))}`);
  }
  console.log();

  console.log(`(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

// ─── Rendering ───────────────────────────────────────────────────────────

function fmt(sec: number): string {
  if (!isFinite(sec)) return '∞ (never)';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function fmtWindow(w: [number, number]): string {
  return `${fmt(w[0])}–${fmt(w[1])}`;
}

function fmtNum(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n >= 1e6) return n.toExponential(2);
  return String(Math.round(n));
}

function fmtExact(n: number): string {
  if (!isFinite(n)) return '∞';
  return String(Math.round(n));
}

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

main();
