/**
 * Cycler — upgrade probe: the permanent catalog on the prestige wallet, on the
 * real engine.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/upgrade-probe.ts`
 *
 * Lane 3 (frontier `docs/balance-process.md` § probe): drives the REAL assembled
 * stack through actual catalog buys. It verifies the Lane-1 projection
 * (`cycler-projection.ts` § g-bender, § decoupling):
 *   1. the reach permanent re-pegs to +0 run length (reach, not pacing);
 *   2. each g-bender level lengthens the run to the closed-form N*(L_bend);
 *   3. the g-bender is reach-gated (locked until permanent power reaches the gate).
 *
 * Coarse tick (1s) per `.claude/CLAUDE.md` § Balance methodology — the crossing is
 * minute-scale and lands within one dt.
 */

import { Decimal } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { createCyclerModules, CycleKey, BuildKey, PrestigeKey, UpgradesKey } from '../modules';
import { THREAT_BALANCE } from '../data/threat';
import { UPGRADE_BALANCE } from '../data/upgrades';

const TICK_RATE = 1;
const MAX_TICKS = 400_000;

const {
  headroom: H,
  escalationBase: g,
  escalationTimescale: Tg,
  setupGrace: setup,
} = THREAT_BALANCE;
const { gBendRatio, gBendBaseCost, gBendCostRatio, gBendGateStep } = UPGRADE_BALANCE;

// ─── Closed-form oracles (the Lane-1 projection, recomputed here) ──────────────
const gEffAt = (Lb: number): number => 1 + (g - 1) * Math.pow(gBendRatio, Lb);
const runLengthAt = (Lb: number): number => setup + Tg * (Math.log(H) / Math.log(gEffAt(Lb)));
const gBendCost = (Lb: number): number => gBendBaseCost * Math.pow(gBendCostRatio, Lb); // price L_bend→L_bend+1

const fmt = (m: number): string => (m < 90 ? `${m.toFixed(2)}m` : `${(m / 60).toFixed(2)}h`);
const HEAD = (s: string): void => console.log(`\n═══ ${s} ═══`);

function bootStack() {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createCyclerModules()],
    tickRate: TICK_RATE,
    namespacePrefix: 'upgrade-probe',
  });
  const cycle = handle.engine.tryInject(CycleKey);
  const build = handle.engine.tryInject(BuildKey);
  const prestige = handle.engine.tryInject(PrestigeKey);
  const upgrades = handle.engine.tryInject(UpgradesKey);
  if (!cycle || !build || !prestige || !upgrades)
    throw new Error('upgrade-probe: cycler stack did not install');
  return { handle, cycle, build, prestige, upgrades };
}

// ─── Probe 1 — the reach permanent re-pegs to +0 run length ────────────────────

async function probeReach(): Promise<void> {
  HEAD('Probe 1 — reach is +0 run length (buys D_max, the peg re-baselines W₀)');
  const { handle, cycle, build, prestige, upgrades } = bootStack();
  const target = runLengthAt(0);
  console.log(`  authored N* = ${fmt(target)} — must hold across every reach buy`);
  console.log(
    '  L'.padEnd(4) + 'D_max'.padEnd(10) + 'run len'.padEnd(10) + 'drift'.padEnd(9) + 'reach cost',
  );
  let maxDrift = 0;
  for (let i = 0; i < 6; i++) {
    await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
    const L = build.powerLevel.value;
    const len = cycle.endedAtMinutes.value ?? Number.NaN;
    const drift = ((len - target) / target) * 100;
    maxDrift = Math.max(maxDrift, Math.abs(drift));
    const cost = new Decimal(upgrades.reach.getCost()).toNumber();
    console.log(
      `  ${L}`.padEnd(4) +
        Math.round(build.dMax.value.toNumber()).toLocaleString().padEnd(10) +
        fmt(len).padEnd(10) +
        `${drift >= 0 ? '+' : ''}${drift.toFixed(2)}%`.padEnd(9) +
        `${cost}`,
    );
    if (upgrades.reach.canPurchase.value) upgrades.reach.purchase();
    prestige.merge();
  }
  console.log(
    `  max run-length drift ${maxDrift.toFixed(2)}% while D_max climbed — reach, not pacing.`,
  );
  handle.dispose();
}

// ─── Probe 2 — each g-bender level lengthens the run to N*(L_bend) ──────────────

async function probeGBender(): Promise<void> {
  HEAD('Probe 2 — the g-bender lengthens the run to the closed-form N*(L_bend)');
  const { handle, cycle, build, prestige, upgrades } = bootStack();
  // Force reach high enough to clear every bend gate (level 4 needs L ≥ 8), then
  // re-peg (W₀ = dMax(L)/H) so the baseline run is the authored N*, not the stale
  // boot-time peg — raising power alone leaves W₀ frozen at L=0's baseline.
  const maxLevel = 4;
  for (let i = 0; i < maxLevel * gBendGateStep; i++) build.raisePower();
  cycle.startRun();
  console.log(`  forced reach L=${build.powerLevel.value} (clears all bend gates); base g=${g}`);
  console.log(
    '  L_bend'.padEnd(9) +
      'g_eff'.padEnd(8) +
      'measured N*'.padEnd(14) +
      'predicted'.padEnd(12) +
      'drift'.padEnd(9) +
      'cost',
  );
  let maxDrift = 0;
  for (let Lb = 0; Lb <= maxLevel; Lb++) {
    // Bank the next level's price, then buy it (level 0 = baseline, no buy).
    if (Lb > 0) {
      while (prestige.fragments.value.toNumber() < gBendCost(Lb - 1)) {
        if (cycle.runState.value === 'ended') prestige.merge();
        await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
      }
      if (cycle.runState.value !== 'ended')
        await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
      upgrades.gBender.purchase();
    }
    // Re-peg so the (possibly bent) schedule freezes into the measured run.
    if (cycle.runState.value === 'ended') prestige.merge();
    await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
    const measured = cycle.endedAtMinutes.value ?? Number.NaN;
    const predicted = runLengthAt(Lb);
    const drift = ((measured - predicted) / predicted) * 100;
    maxDrift = Math.max(maxDrift, Math.abs(drift));
    console.log(
      `  ${Lb}`.padEnd(9) +
        gEffAt(Lb).toFixed(2).padEnd(8) +
        fmt(measured).padEnd(14) +
        fmt(predicted).padEnd(12) +
        `${drift >= 0 ? '+' : ''}${drift.toFixed(2)}%`.padEnd(9) +
        (Lb < maxLevel ? `${gBendCost(Lb)}` : '—'),
    );
  }
  console.log(
    `  max drift ${maxDrift.toFixed(3)}% — the g-bender lengthens the run to the closed form; g_eff → 1 asymptote.`,
  );
  handle.dispose();
}

// ─── Probe 3 — the g-bender is reach-gated ─────────────────────────────────────

async function probeGate(): Promise<void> {
  HEAD('Probe 3 — the g-bender is reach-gated (locked on power, not Fragments)');
  const { handle, cycle, build, prestige, upgrades } = bootStack();
  // Bank well past the level-1 cost while power stays at 0.
  while (prestige.fragments.value.toNumber() < gBendCost(0) + 5) {
    if (cycle.runState.value === 'ended') prestige.merge();
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
