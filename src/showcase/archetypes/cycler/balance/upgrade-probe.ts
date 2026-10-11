/**
 * Cycler — upgrade probe: the permanent catalog on the prestige wallet, on the real
 * engine.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/upgrade-probe.ts`
 *
 * Probe (`open-loop-engine/docs/consumer-guide-balance.md`
 * § The probe — real engine, real policies): drives the REAL assembled stack
 * over the reference board through actual catalog buys. Verifies the projection:
 *   1. the reach permanent re-pegs to +0 run length (reach, not pacing);
 *   2. each g-bender level lengthens the run (bends salvo g toward the g=1 asymptote);
 *   3. the g-bender is reach-gated (locked until permanent power reaches the gate).
 *
 * Coarse tick (1s) per `.claude/CLAUDE.md` § Balance methodology. Absolute run-length
 * magnitudes are measured, never authored; this probe reports measured trends.
 */

import { Decimal } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { createCyclerModules, CycleKey, BuildKey, PrestigeKey, UpgradesKey } from '../modules';
import { DEFENSE_BALANCE } from '../data/defense';
import { UPGRADE_BALANCE } from '../data/upgrades';
import { placeReference } from './_board';

const INTERVAL_RATE = 1;
const MAX_TICKS = 400_000;

const g = DEFENSE_BALANCE.salvoBase;
const { gBendRatio, gBendBaseCost, gBendCostRatio, gBendGateStep } = UPGRADE_BALANCE;

const gEffAt = (Lb: number): number => 1 + (g - 1) * Math.pow(gBendRatio, Lb);
const gBendCost = (Lb: number): number => gBendBaseCost * Math.pow(gBendCostRatio, Lb); // price L_bend→L_bend+1

const fmt = (m: number): string => (m < 90 ? `${m.toFixed(2)}m` : `${(m / 60).toFixed(2)}h`);
const HEAD = (s: string): void => console.log(`\n═══ ${s} ═══`);

function bootStack() {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createCyclerModules()],
    intervalRate: INTERVAL_RATE,
    persistenceNamespacePrefix: 'upgrade-probe',
  });
  const cycle = handle.engine.tryInject(CycleKey);
  const build = handle.engine.tryInject(BuildKey);
  const prestige = handle.engine.tryInject(PrestigeKey);
  const upgrades = handle.engine.tryInject(UpgradesKey);
  if (!cycle || !build || !prestige || !upgrades)
    throw new Error('upgrade-probe: cycler stack did not install');
  placeReference(build);
  return { handle, cycle, build, prestige, upgrades };
}

// ─── Probe 1 — the reach permanent re-pegs to +0 run length ────────────────────

async function probeReach(): Promise<void> {
  HEAD('Probe 1 — reach is +0 run length (buys cMax, the peg re-baselines W₀)');
  const { handle, cycle, build, prestige, upgrades } = bootStack();
  console.log('  L'.padEnd(4) + 'cMax'.padEnd(10) + 'run len'.padEnd(10) + 'reach cost');
  const lengths: number[] = [];
  for (let i = 0; i < 6; i++) {
    await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
    const L = build.powerLevel.value;
    const len = cycle.endedAtMinutes.value ?? Number.NaN;
    lengths.push(len);
    console.log(
      `  ${L}`.padEnd(4) +
        Math.round(build.cMax.value.toNumber()).toLocaleString().padEnd(10) +
        fmt(len).padEnd(10) +
        `${new Decimal(upgrades.reach.getCost()).toNumber()}`,
    );
    if (upgrades.reach.canPurchase.value) upgrades.reach.purchase();
    prestige.merge();
    placeReference(build); // Redeploy rebuilds the board
  }
  const [lo, hi] = [Math.min(...lengths), Math.max(...lengths)];
  console.log(
    `  run length spread ${(hi - lo).toFixed(3)}m while cMax climbed — reach, not pacing.`,
  );
  handle.dispose();
}

// ─── Probe 2 — each g-bender level lengthens the run ───────────────────────────

async function probeGBender(): Promise<void> {
  HEAD('Probe 2 — the g-bender lengthens the run (bends salvo g → 1 asymptote)');
  const { handle, cycle, build, prestige, upgrades } = bootStack();
  const maxLevel = 4;
  for (let i = 0; i < maxLevel * gBendGateStep; i++) build.raisePower(); // clear every bend gate
  cycle.startRun();
  console.log(`  forced reach L=${build.powerLevel.value} (clears all bend gates); base g=${g}`);
  console.log('  L_bend'.padEnd(9) + 'g_eff'.padEnd(8) + 'measured'.padEnd(12) + 'cost');
  let prev = -Infinity;
  for (let Lb = 0; Lb <= maxLevel; Lb++) {
    if (Lb > 0) {
      while (prestige.fragments.value.toNumber() < gBendCost(Lb - 1)) {
        if (cycle.runState.value === 'ended') {
          prestige.merge();
          placeReference(build);
        }
        await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
      }
      upgrades.gBender.purchase();
    }
    if (cycle.runState.value === 'ended') {
      prestige.merge();
      placeReference(build);
    }
    await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
    const measured = cycle.endedAtMinutes.value ?? Number.NaN;
    console.log(
      `  ${Lb}`.padEnd(9) +
        gEffAt(Lb).toFixed(2).padEnd(8) +
        fmt(measured).padEnd(12) +
        (Lb < maxLevel ? `${gBendCost(Lb)}` : '—') +
        (Lb > 0 ? (measured >= prev ? '  ↑ longer ✓' : '  ✗ shorter') : ''),
    );
    prev = measured;
  }
  console.log('  Lower g_eff ⇒ shallower salvo ⇒ longer run — the sole pace lever, gated.');
  handle.dispose();
}

// ─── Probe 3 — the g-bender is reach-gated ─────────────────────────────────────

async function probeGate(): Promise<void> {
  HEAD('Probe 3 — the g-bender is reach-gated (locked on power, not Fragments)');
  const { handle, cycle, build, prestige, upgrades } = bootStack();
  while (prestige.fragments.value.toNumber() < gBendCost(0) + 5) {
    if (cycle.runState.value === 'ended') {
      prestige.merge();
      placeReference(build);
    }
    await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
  }
  const gateFor1 = 1 * gBendGateStep;
  console.log(
    `  wallet ${prestige.fragments.value.toNumber()} ≥ cost ${gBendCost(0)}, but L=${build.powerLevel.value} < gate ${gateFor1}: canPurchase = ${upgrades.gBender.canPurchase.value}`,
  );
  for (let i = 0; i < gateFor1; i++) build.raisePower();
  console.log(
    `  raise reach to L=${build.powerLevel.value} ≥ gate ${gateFor1}: canPurchase = ${upgrades.gBender.canPurchase.value}`,
  );
  handle.dispose();
}

async function main(): Promise<void> {
  console.log('Cycler — upgrade probe (the permanent catalog, real engine)');
  await probeReach();
  await probeGBender();
  await probeGate();
  console.log('');
}

main();
