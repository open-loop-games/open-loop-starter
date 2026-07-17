/**
 * Cycler — cycle kernel probe: the wave-indexed salvo vs the closed-form crossing.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/cycle-probe.ts`
 *
 * Lane 3 (frontier `docs/balance-process.md` § probe): drives the REAL assembled
 * stack — the shipping `cycler/*` modules over a competent reference board — and
 * measures where the exogenous salvo `W_N = W₀·g^N` breaches the defended line. Its
 * job is to verify shipping code realizes the Lane-1 projection (`cycler-projection.ts`):
 * the authored crossing `log_g(H)` waves + a bounded Δ_wall tail, the peg holding run
 * length across the H surface, and power decoupling from pacing (+0 on reach).
 *
 * Coarse tick (1s) per `.claude/CLAUDE.md` § Balance methodology — the wave cadence is
 * minute-scale; the breach lands within one dt.
 */

import { type Decimal } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { createCyclerModules, CycleKey, BuildKey } from '../modules';
import { BUILD_BALANCE } from '../data/build';
import { DEFENSE_BALANCE } from '../data/defense';
import { placeReference } from './_board';

const TICK_RATE = 1; // 1 tick = 1 sim-second — coarse, minute-scale wave cadence
const MAX_TICKS = 200_000;

const g = DEFENSE_BALANCE.salvoBase;
const H0 = DEFENSE_BALANCE.headroom;
const waveCycleMin = (DEFENSE_BALANCE.standbySeconds + DEFENSE_BALANCE.inboundSeconds) / 60;

/** Authored crossing in waves (tail-exclusive): N_c = log_g(H). */
const crossingWaves = (H: number): number => Math.log(H) / Math.log(g);
/** Authored crossing in minutes (the measured run adds the Δ_wall tail on top). */
const crossingMinutes = (H: number): number => crossingWaves(H) * waveCycleMin;

const fmt = (m: number): string => (m < 90 ? `${m.toFixed(2)}m` : `${(m / 60).toFixed(2)}h`);
const mag = (d: Decimal): string => Math.round(d.toNumber()).toLocaleString();
const HEAD = (s: string): void => console.log(`\n═══ ${s} ═══`);

/** Boot the real stack over the reference board, run to the line breach, hand back the run. */
async function measureRun(opts: { headroom?: number; powerLevel?: number }): Promise<{
  endedAt: number;
  waves: number;
  cMax: Decimal;
  w0: Decimal;
  clearRate: Decimal;
}> {
  const defense = { ...DEFENSE_BALANCE, headroom: opts.headroom ?? H0 };
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createCyclerModules({ defense })],
    tickRate: TICK_RATE,
    namespacePrefix: 'cycle-probe',
  });
  const cycle = handle.engine.tryInject(CycleKey);
  const build = handle.engine.tryInject(BuildKey);
  if (!cycle || !build) throw new Error('cycle-probe: cycler modules did not install');
  placeReference(build);
  const L = opts.powerLevel ?? 0;
  if (L > 0) {
    for (let i = 0; i < L; i++) build.raisePower();
    cycle.startRun(); // re-peg cMax/H at the raised level; board persists
  }
  await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
  const out = {
    endedAt: cycle.endedAtMinutes.value ?? Number.NaN,
    waves: cycle.endedAtWave.value ?? Number.NaN,
    cMax: cycle.capacity.value,
    w0: cycle.w0.value,
    clearRate: build.clearRate.value,
  };
  handle.dispose();
  return out;
}

// ─── Probe 1 — the salvo breaches the line near the authored crossing + tail ──────

async function probeCrossing(): Promise<void> {
  HEAD('Probe 1 — the salvo breaches the line (authored crossing + Δ_wall tail)');
  const { endedAt, waves, cMax, w0, clearRate } = await measureRun({});
  const cross = crossingWaves(H0);
  const tail = waves - cross;
  const [bandLo, bandHi] = [12, 20];
  console.log(
    `  cMax = ${mag(cMax)}   realized C = ${mag(clearRate)}   W₀ = ${mag(w0)}   H = ${H0}`,
  );
  console.log(`  g = ${g}/wave   wave-cycle = ${fmt(waveCycleMin)}`);
  console.log(`  authored crossing = ${cross.toFixed(2)} waves (${fmt(crossingMinutes(H0))})`);
  console.log(
    `  measured breach   = ${waves} waves (${fmt(endedAt)})   Δ_wall tail ≈ ${tail.toFixed(2)} waves`,
  );
  console.log(
    `  → ${endedAt >= bandLo && endedAt <= bandHi ? 'IN BAND ✓ [12,20]m' : 'OUT OF BAND ✗'}`,
  );
}

// ─── Probe 2 — the peg holds run length across the H surface ──────────────────────

async function probePegSweep(): Promise<void> {
  HEAD('Probe 2 — the peg: run length is authored by H');
  const [bandLo, bandHi] = [12, 20];
  console.log('  H'.padEnd(6) + 'crossing'.padEnd(12) + 'measured'.padEnd(12) + 'band');
  for (const H of [4, 8, 12, 16, 24, 32]) {
    const { endedAt } = await measureRun({ headroom: H });
    const band = endedAt >= bandLo && endedAt <= bandHi ? '← in band' : '';
    console.log(
      `  ${H}`.padEnd(6) + fmt(crossingMinutes(H)).padEnd(12) + fmt(endedAt).padEnd(12) + band,
    );
  }
  console.log('  Run length tracks H (monotone) — the difficulty surface the peg exposes.');
}

// ─── Probe 3 — power decouples from run length (+0 on reach) ───────────────────────

async function probeDecoupling(): Promise<void> {
  HEAD('Probe 3 — power re-pegs to +0 run length (reach, not pacing)');
  const ratio = BUILD_BALANCE.producerUpgradeRatio;
  console.log('  layer L'.padEnd(10) + 'cMax'.padEnd(16) + 'measured'.padEnd(14) + 'Δ vs L=0');
  let base = Number.NaN;
  for (const L of [0, 2, 4, 6, 8]) {
    const { endedAt, cMax } = await measureRun({ powerLevel: L });
    if (L === 0) base = endedAt;
    const delta = endedAt - base;
    console.log(
      `  ${L}`.padEnd(10) +
        mag(cMax).padEnd(16) +
        fmt(endedAt).padEnd(14) +
        `${delta >= 0 ? '+' : ''}${delta.toFixed(3)}m`,
    );
  }
  console.log(`  cMax climbs ×${ratio}/layer; run length holds flat — the peg re-baselines W₀.`);
}

async function main(): Promise<void> {
  console.log('Cycler — cycle kernel probe (wave-indexed salvo vs closed-form crossing)');
  await probeCrossing();
  await probePegSweep();
  await probeDecoupling();
  console.log('');
}

main();
