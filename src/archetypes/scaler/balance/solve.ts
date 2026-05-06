/**
 * Scaler balance solver — methodology #1 (spec/calibrate/lock).
 *
 * Per `archetypes/BALANCING.md § Theme 3 #1`. Each beat gets bisected
 * against the bot-driven engine (`buildScalerSimEngine`) by mutating the
 * archetype's perturbation surface and running `runUntil` against a
 * shared engine. One engine per solve-pass — bisection iterations reset
 * state via `saveManager.importSave(initialBlob)` instead of rebuilding.
 *
 * Run: `pnpm exec vite-node src/archetypes/scaler/balance/solve.ts`.
 * Prints a proposed-patch report. Does NOT mutate data files.
 *
 * Sub-leaf B scope: scaffolding only. Per-beat solvers stubbed; per-
 * subsystem calibration is sub-leaves C (antimatter), D (prestige
 * timing), and E (ECC softcap). Sub-leaf B's deliverable is "the
 * scaffolding compiles and the bot drives sim coherently"; B does NOT
 * converge any beat.
 *
 * The `SamplerContext` shape + push-scope ceremony + importSave reset
 * are pre-wired so C/D/E plug in their per-subsystem bisection logic
 * without re-deriving the load-bearing engine-discipline pieces.
 *
 * **Open uncertainty before C/D/E:** scaler doesn't yet have a
 * `OverrideRegistry` analog (producer's `ProducerTuningRegistryKey`).
 * The perturbation surface for solver-side bisection is the per-archetype
 * data overrides via `applyScalerOverrides`, which require rebuilding
 * the engine per iteration — incompatible with the build-once + scope-
 * push pattern producer uses. C/D/E need to either:
 *   (a) rebuild the engine per bisection sample (slow but simple), or
 *   (b) introduce a scaler-side tuning registry mirroring producer's
 *       `ProducerTuningRegistryKey` shape.
 * Decide at C triage; the placeholder below assumes (a).
 */

import { runUntil, type Engine } from 'open-loop-engine';
import { ARC_BEATS, BEAT_WINDOWS } from './beats';
import { buildScalerSimEngine } from './bot';
import type { ScalerOverrides } from '..';

const BUDGET_SEC = BEAT_WINDOWS['beat-8']![1] * 2.5;

interface SamplerContext {
  engine: Engine;
  initialBlob: string;
}

/**
 * Sample a beat's fire-time. Resets engine state via `importSave`, runs
 * `runUntil`, returns elapsed sim-time at predicate fire (or +∞ if the
 * predicate never fired within budget).
 *
 * No per-iteration overrides yet — C/D/E wire the perturbation surface
 * (see header note on the open scaler-side tuning registry decision).
 */
function sampleBeat(ctx: SamplerContext, beatId: string): number {
  const beat = ARC_BEATS.find((b) => b.id === beatId);
  if (!beat) throw new Error(`no beat ${beatId} in ARC_BEATS`);

  const result = ctx.engine.saveManager!.importSave(ctx.initialBlob);
  if (!result.success) throw new Error(`importSave failed for beat ${beatId}`);

  const { terminated, elapsedSimulated } = runUntil({
    engine: ctx.engine,
    until: () => beat.predicate(ctx.engine),
    maxSimTime: BUDGET_SEC,
    tickDelta: 1,
  });
  return terminated === 'predicate' ? elapsedSimulated : Infinity;
}

interface VerifyRow {
  beatId: string;
  window: [number, number];
  firedAt: number;
  inWindow: boolean;
}

function verifyAll(ctx: SamplerContext): VerifyRow[] {
  return ARC_BEATS.map((beat) => {
    const window = BEAT_WINDOWS[beat.id]!;
    const firedAt = sampleBeat(ctx, beat.id);
    return {
      beatId: beat.id,
      window,
      firedAt,
      inWindow: isFinite(firedAt) && firedAt >= window[0] && firedAt <= window[1],
    };
  });
}

function main(): void {
  const t0 = Date.now();

  console.log('# Scaler balance solver (sub-leaf B scaffolding) — engine as oracle\n');
  console.log(`Run at ${new Date().toISOString()}\n`);
  console.log('Sub-leaf B installs the bisection skeleton; per-beat solvers are stubbed.');
  console.log('Per-subsystem calibration belongs to sub-leaves C/D/E.\n');

  const overrides: ScalerOverrides | undefined = undefined;
  const engine = buildScalerSimEngine(overrides);
  const initialBlob = engine.saveManager!.exportSave();
  const ctx: SamplerContext = { engine, initialBlob };

  console.log('## Default-data verification — fire times for ARC_BEATS\n');
  const verified = verifyAll(ctx);
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

  const offTarget = verified.filter((v) => !v.inWindow);
  console.log();
  if (offTarget.length > 0) {
    console.log(
      `${offTarget.length}/${verified.length} beat(s) drift out-of-window under defaults.`,
    );
    console.log(
      'Sub-leaf C will calibrate beats 1–2 (antimatter); D will tackle 3–5; E will tackle 6–8.',
    );
  }

  console.log(`\n(total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}

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

function renderTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const row = (cells: string[]) =>
    `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;
  const sep = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  return [row(header), sep, ...rows.map(row)].join('\n');
}

main();
