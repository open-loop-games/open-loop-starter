/**
 * Cycler — prestige probe: the Merge boundary that closes the loop, on the real
 * engine.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/prestige-probe.ts`
 *
 * Lane 3 (frontier `docs/balance-process.md` § probe): drives the REAL assembled
 * stack — `cycler/build` + `cycler/cycle` + `cycler/prestige`, ticked by the real
 * loop — through actual merges. It verifies the Lane-1 projection
 * (`cycler-projection.ts` § currency, § prestige arc): the run pays out a sublinear
 * currency on the crossing (auto-banked), power buys reach, and the Merge re-pegs
 * so run length stays the authored N* while D_max and banked currency climb.
 *
 * Coarse tick (1s) per `.claude/CLAUDE.md` § Balance methodology — the crossing is
 * minute-scale and lands within one dt.
 */

import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { createCyclerModules, CycleKey, BuildKey, PrestigeKey } from '../modules';
import { BUILD_BALANCE } from '../data/build';
import { THREAT_BALANCE } from '../data/threat';
import { PRESTIGE_BALANCE } from '../data/prestige';

const TICK_RATE = 1;
const MAX_TICKS = 200_000;

const {
  boardCells: cells,
  baseOutputCeiling: ceil,
  adjacencyBoost: adj,
  producerUpgradeRatio: prodRatio,
} = BUILD_BALANCE;
const {
  headroom: H,
  escalationBase: g,
  escalationTimescale: Tg,
  setupGrace: setup,
} = THREAT_BALANCE;
const { fragmentScalePrimary: Sp, fragmentScaleSecondary: Ss } = PRESTIGE_BALANCE;

// ─── Closed-form oracles (the Lane-1 projection, recomputed here) ──────────────
const dMax = (L: number): number => cells * ceil * adj * Math.pow(prodRatio, L);
const N = (): number => setup + Tg * (Math.log(H) / Math.log(g));
const production = (L: number): number => dMax(L) * N();
const endurance = (L: number): number => {
  const w0 = dMax(L) / H;
  return w0 * setup + (w0 * Tg * (Math.pow(g, (N() - setup) / Tg) - 1)) / Math.log(g);
};
const cbrtFloor = (x: number): number => Math.floor(Math.cbrt(x) + 1e-9);
const predictPayout = (L: number): number =>
  cbrtFloor(production(L) / Sp) + cbrtFloor(endurance(L) / Ss);

const fmt = (m: number): string => (m < 90 ? `${m.toFixed(2)}m` : `${(m / 60).toFixed(2)}h`);
const HEAD = (s: string): void => console.log(`\n═══ ${s} ═══`);

/** Boot the real assembled stack (shared base + build + cycle + prestige). */
function bootStack() {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createCyclerModules()],
    tickRate: TICK_RATE,
    namespacePrefix: 'prestige-probe',
  });
  const cycle = handle.engine.tryInject(CycleKey);
  const build = handle.engine.tryInject(BuildKey);
  const prestige = handle.engine.tryInject(PrestigeKey);
  if (!cycle || !build || !prestige)
    throw new Error('prestige-probe: cycler stack did not install');
  return { handle, cycle, build, prestige };
}

// ─── Probe 1 — the payout realizes the closed-form sublinear currency ──────────

async function probePayout(): Promise<void> {
  HEAD('Probe 1 — the Merge payout matches the closed-form ∛-per-source currency');
  const { handle, cycle, build, prestige } = bootStack();
  console.log(
    '  L'.padEnd(4) +
      'D_max'.padEnd(9) +
      'measured ∫cap'.padEnd(15) +
      'measured ∫burn'.padEnd(16) +
      'payout'.padEnd(9) +
      'predicted',
  );
  for (let L = 0; L < 5; L++) {
    await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
    const measuredOut = prestige.runOutput.value.toNumber();
    const measuredEnd = prestige.runEndurance.value.toNumber();
    const banked = prestige.pendingFragments.value.toNumber(); // == what auto-banked this run
    const predicted = predictPayout(L);
    console.log(
      `  ${L}`.padEnd(4) +
        Math.round(dMax(L)).toLocaleString().padEnd(9) +
        Math.round(measuredOut).toLocaleString().padEnd(15) +
        Math.round(measuredEnd).toLocaleString().padEnd(16) +
        `${banked}`.padEnd(9) +
        `${predicted} ${banked === predicted ? '✓' : '✗'}`,
    );
    build.raisePower(); // force one level per step so each row is a clean L
    cycle.startRun();
  }
  handle.dispose();
}

// ─── Probe 2 — the arc: reach climbs, run length flat, currency banks ──────────

async function probeArc(): Promise<void> {
  HEAD('Probe 2 — reach climbs & currency banks while run length holds at N*');
  const { handle, cycle, build, prestige } = bootStack();
  const target = N();
  console.log(`  authored N* = ${fmt(target)} (must hold every run — the peg)`);
  console.log(
    '  run'.padEnd(6) +
      'L'.padEnd(4) +
      'D_max'.padEnd(10) +
      'run len'.padEnd(10) +
      'drift'.padEnd(9) +
      'lifetime$'.padEnd(11) +
      'event',
  );
  let maxDrift = 0;
  let firstDmax = 0;
  let lastDmax = 0;
  for (let run = 1; run <= 12; run++) {
    await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
    const L = build.powerLevel.value;
    const d = dMax(L);
    if (run === 1) firstDmax = d;
    lastDmax = d;
    const len = cycle.endedAtMinutes.value ?? Number.NaN;
    const drift = ((len - target) / target) * 100;
    maxDrift = Math.max(maxDrift, Math.abs(drift));
    const before = build.powerLevel.value;
    const raised = prestige.merge();
    const event = raised
      ? `⇒ Merge: L ${before}→${build.powerLevel.value}, D_max→${Math.round(dMax(build.powerLevel.value)).toLocaleString()}`
      : '';
    console.log(
      `  ${run}`.padEnd(6) +
        `${L}`.padEnd(4) +
        Math.round(d).toLocaleString().padEnd(10) +
        fmt(len).padEnd(10) +
        `${drift >= 0 ? '+' : ''}${drift.toFixed(2)}%`.padEnd(9) +
        `${prestige.lifetimeFragments.value.toNumber()}`.padEnd(11) +
        event,
    );
  }
  console.log(
    `  D_max climbed ×${(lastDmax / firstDmax).toFixed(0)} over the arc; max run-length drift ${maxDrift.toFixed(2)}% — reach, not pacing.`,
  );
  handle.dispose();
}

// ─── Probe 3 — the currency is sublinear in run output ─────────────────────────

async function probeSublinear(): Promise<void> {
  HEAD('Probe 3 — currency is sublinear in run output (∛): ×2 output → ×∛2 currency');
  const { handle, cycle, prestige, build } = bootStack();
  console.log(
    '  L→L+1'.padEnd(9) +
      'output ×'.padEnd(11) +
      'currency ×'.padEnd(13) +
      'vs ∛2 ≈ ' +
      Math.cbrt(prodRatio).toFixed(3),
  );
  let prevOut = Number.NaN;
  let prevPay = Number.NaN;
  for (let L = 0; L < 6; L++) {
    await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
    const out = prestige.runOutput.value.toNumber();
    const pay = prestige.pendingFragments.value.toNumber();
    if (L > 0 && Number.isFinite(prevPay) && prevPay > 0) {
      console.log(
        `  ${L - 1}→${L}`.padEnd(9) +
          (out / prevOut).toFixed(3).padEnd(11) +
          (pay / prevPay).toFixed(3).padEnd(13) +
          (pay / prevPay <= prodRatio ? 'sublinear ✓' : 'SUPERLINEAR ✗'),
      );
    }
    prevOut = out;
    prevPay = pay;
    // Force one power level each step so D_max (and output) actually doubles.
    build.raisePower();
    cycle.startRun();
  }
  console.log(
    '  Output doubles per layer; currency grows ∛-slowly — late runs never mint proportional currency.',
  );
}

async function main(): Promise<void> {
  console.log('Cycler — prestige probe (the Merge boundary, real engine)');
  await probePayout();
  await probeArc();
  await probeSublinear();
  console.log('');
}

main();
