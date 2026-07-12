/**
 * Cycler — first sim probe: the scheduled burn vs the closed-form crossing.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/cycle-probe.ts`
 *
 * Lane 3 (frontier `docs/balance-process.md` § probe): drives the REAL assembled
 * engine — the shipping `cycler/cycle` kernel, ticked by the real loop — and
 * measures where the exogenous burn overtakes the capacity ceiling D_max. Its job
 * is to verify that shipping code realizes the Lane-1 projection
 * (`cycler-projection.ts`): run length is the AUTHORED
 * `N* = τ_setup + T_g·log_g(H)`, the peg holds it flat across the H surface, and
 * power (D_max) decouples from pacing (re-pegs to +0 run length).
 *
 * Coarse tick (1s) per `.claude/CLAUDE.md` § Balance methodology — minute-scale
 * events don't need sub-second fidelity; the crossing lands within one dt.
 */

import { Decimal, type Engine } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { createCycleModule, CycleKey, type CycleApi } from '../modules';
import { BUILD_BALANCE } from '../data/build';
import { THREAT_BALANCE } from '../data/threat';

const TICK_RATE = 1; // 1 tick = 1 sim-second — coarse, minute-scale run
const MAX_TICKS = 200_000;

const g = THREAT_BALANCE.escalationBase;
const Tg = THREAT_BALANCE.escalationTimescale;
const setup = THREAT_BALANCE.setupGrace;
const baseCapacity =
  BUILD_BALANCE.boardCells * BUILD_BALANCE.baseOutputCeiling * BUILD_BALANCE.adjacencyBoost;

/** Closed-form pegged run length — the projection's N* = τ_setup + T_g·log_g(H). */
const predictN = (H: number): number => setup + Tg * (Math.log(H) / Math.log(g));

const fmt = (m: number): string => (m < 90 ? `${m.toFixed(2)}m` : `${(m / 60).toFixed(2)}h`);
const mag = (d: Decimal): string => Math.round(d.toNumber()).toLocaleString();
const HEAD = (s: string): void => console.log(`\n═══ ${s} ═══`);

/** Boot the real kernel, run to the Merge bell, hand back the measured run. */
async function measureRun(opts: {
  headroom?: number;
  capacity?: Decimal;
}): Promise<{ endedAt: number; predicted: number; cycle: CycleApi; engine: Engine }> {
  const threat = { ...THREAT_BALANCE, headroom: opts.headroom ?? THREAT_BALANCE.headroom };
  const module = createCycleModule({
    threat,
    capacity: opts.capacity ? () => opts.capacity as Decimal : undefined,
  });
  const handle = bootTestEngine({
    modules: [module],
    tickRate: TICK_RATE,
    namespacePrefix: 'cycle-probe',
  });
  const cycle = handle.engine.tryInject(CycleKey);
  if (!cycle) throw new Error('cycle-probe: cycle module did not provide CycleKey');
  await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
  handle.dispose();
  return {
    endedAt: cycle.endedAtMinutes.value ?? Number.NaN,
    predicted: cycle.predictedRunLength(),
    cycle,
    engine: handle.engine,
  };
}

// ─── Probe 1 — the crossing lands at the authored N* ──────────────────────────

async function probeCrossing(): Promise<void> {
  HEAD('Probe 1 — burn crosses D_max at the authored N* (default constants)');
  const { endedAt, predicted, cycle } = await measureRun({});
  const projection = predictN(THREAT_BALANCE.headroom);
  const driftPct = ((endedAt - predicted) / predicted) * 100;
  console.log(
    `  D_max = ${mag(cycle.capacity.value)}   W₀ = ${mag(cycle.w0.value)}   H = ${THREAT_BALANCE.headroom}`,
  );
  console.log(`  g = ${g}/${fmt(Tg)}   τ_setup = ${fmt(setup)}`);
  console.log(`  projection N* (Lane 1)  = ${fmt(projection)}`);
  console.log(`  kernel  N* (api)        = ${fmt(predicted)}`);
  console.log(
    `  measured (real engine)  = ${fmt(endedAt)}   drift ${driftPct >= 0 ? '+' : ''}${driftPct.toFixed(2)}%`,
  );
  console.log(
    `  → ${Math.abs(driftPct) < 0.5 ? 'MATCH ✓ (shipping burn = projection)' : 'DRIFT ✗'}`,
  );
}

// ─── Probe 2 — the peg holds run length flat across the H surface ─────────────

async function probePegSweep(): Promise<void> {
  HEAD('Probe 2 — the peg: run length is one authored number (H)');
  const [bandLo, bandHi] = [12, 20]; // CADENCE_BALANCE.runLengthTargetMinutes
  console.log(
    '  H'.padEnd(6) + 'predicted'.padEnd(12) + 'measured'.padEnd(12) + 'drift'.padEnd(10) + 'band',
  );
  for (const H of [2, 3, 4, 6, 8, 16]) {
    const { endedAt, predicted } = await measureRun({ headroom: H });
    const driftPct = ((endedAt - predicted) / predicted) * 100;
    const band = endedAt >= bandLo && endedAt <= bandHi ? '← in band' : '';
    console.log(
      `  ${H}`.padEnd(6) +
        fmt(predicted).padEnd(12) +
        fmt(endedAt).padEnd(12) +
        `${driftPct >= 0 ? '+' : ''}${driftPct.toFixed(2)}%`.padEnd(10) +
        band,
    );
  }
  console.log('  Run length tracks H alone — the difficulty surface the peg exposes.');
}

// ─── Probe 3 — power (D_max) decouples from run length ─────────────────────────

async function probeDecoupling(): Promise<void> {
  HEAD('Probe 3 — power re-pegs to +0 run length (D_max buys reach, not pacing)');
  const ratio = BUILD_BALANCE.producerUpgradeRatio;
  console.log(
    '  layer L'.padEnd(10) + 'D_max'.padEnd(16) + 'measured N*'.padEnd(14) + 'ΔN* vs L=0',
  );
  let base = Number.NaN;
  for (const L of [0, 2, 4, 6, 8]) {
    const capacity = new Decimal(baseCapacity).mul(Decimal.pow(ratio, L));
    const { endedAt } = await measureRun({ capacity });
    if (L === 0) base = endedAt;
    const delta = endedAt - base;
    console.log(
      `  ${L}`.padEnd(10) +
        mag(capacity).padEnd(16) +
        fmt(endedAt).padEnd(14) +
        `${delta >= 0 ? '+' : ''}${delta.toFixed(3)}m`,
    );
  }
  console.log(
    '  D_max climbs ×' + ratio + '/layer; run length holds flat — the peg re-baselines W₀.',
  );
}

async function main(): Promise<void> {
  console.log('Cycler — cycle kernel probe (scheduled burn vs closed-form crossing)');
  await probeCrossing();
  await probePegSweep();
  await probeDecoupling();
  console.log('');
}

main();
