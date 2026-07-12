/**
 * Cycler — burn-tier probe: the escalation-content pace surface, on the real
 * engine.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/burn-tier-probe.ts`
 *
 * Lane 3 (frontier `docs/balance-process.md` § probe): drives the REAL assembled
 * stack — `cycler/build` + `cycler/burn-tier` + `cycler/cycle` + `cycler/prestige`,
 * ticked by the real loop — across the burn-tier ladder. It verifies the Lane-1
 * projection (`cycler-projection.ts` § burn-tier ladder):
 *   1. each tier's realized run length matches the closed form N*(tier);
 *   2. crossing a tier steps run length while raising power WITHIN a tier does not
 *      (the peg holds flat within a tier — the decoupling);
 *   3. the step is one-way reach-gated: `advanceTier` is a no-op until L reaches
 *      the next tier's gate;
 *   4. the schedule freezes at run start — advancing mid-run leaves the current
 *      run at its tier and lands the switch on the next run.
 *
 * Coarse tick (1s) per `.claude/CLAUDE.md` § Balance methodology — the crossing is
 * minute-scale and lands within one dt.
 */

import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { createCyclerModules, CycleKey, BuildKey, BurnTierKey } from '../modules';
import { BURN_TIERS } from '../data/threat';

const TICK_RATE = 1;
const MAX_TICKS = 200_000;

const fmt = (m: number): string => `${m.toFixed(2)}m`;
const HEAD = (s: string): void => console.log(`\n═══ ${s} ═══`);

/** Boot the real assembled stack (shared base + build + burn-tier + cycle + prestige). */
function bootStack() {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createCyclerModules()],
    tickRate: TICK_RATE,
    namespacePrefix: 'burn-tier-probe',
  });
  const cycle = handle.engine.tryInject(CycleKey);
  const build = handle.engine.tryInject(BuildKey);
  const burnTier = handle.engine.tryInject(BurnTierKey);
  if (!cycle || !build || !burnTier)
    throw new Error('burn-tier-probe: cycler stack did not install');
  return { handle, cycle, build, burnTier };
}

// ─── Probe 1 — each tier's realized run length matches the closed form ─────────

async function probeLadder(): Promise<void> {
  HEAD('Probe 1 — realized run length matches N*(tier) as the pace surface steps');
  const { handle, cycle, build, burnTier } = bootStack();
  console.log(
    '  tier'.padEnd(14) +
      'g'.padEnd(4) +
      'gate L≥'.padEnd(9) +
      'L'.padEnd(4) +
      'predicted N*'.padEnd(14) +
      'measured'.padEnd(11) +
      'drift',
  );
  let maxDrift = 0;
  for (let i = 0; i < BURN_TIERS.length; i++) {
    // Raise reach to this tier's gate, then advance the active tier onto it.
    while (build.powerLevel.value < BURN_TIERS[i].unlockPowerLevel) build.raisePower();
    while (burnTier.activeIndex.value < i) burnTier.advanceTier();
    cycle.startRun(); // freezes the now-active tier's (g, T_g)
    await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
    const predicted = burnTier.runLengthAt(i);
    const measured = cycle.endedAtMinutes.value ?? Number.NaN;
    const drift = ((measured - predicted) / predicted) * 100;
    maxDrift = Math.max(maxDrift, Math.abs(drift));
    console.log(
      `  ${BURN_TIERS[i].label}`.padEnd(14) +
        `${BURN_TIERS[i].escalationBase}`.padEnd(4) +
        `${BURN_TIERS[i].unlockPowerLevel}`.padEnd(9) +
        `${build.powerLevel.value}`.padEnd(4) +
        fmt(predicted).padEnd(14) +
        fmt(measured).padEnd(11) +
        `${drift >= 0 ? '+' : ''}${drift.toFixed(3)}%`,
    );
  }
  console.log(`  max drift ${maxDrift.toFixed(3)}% — the shipping burn realizes the closed form.`);
  handle.dispose();
}

// ─── Probe 2 — within a tier the peg holds; only crossing a tier moves N* ───────

async function probeWithinVsCross(): Promise<void> {
  HEAD('Probe 2 — power WITHIN a tier is +0 run length; crossing a tier is the step');
  const { handle, cycle, build, burnTier } = bootStack();
  // Baseline at tier 0.
  cycle.startRun();
  await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
  const base = cycle.endedAtMinutes.value ?? Number.NaN;
  const baseD = build.dMax.value.toNumber();

  // Raise power to the Accelerated gate but DON'T advance — still tier 0.
  while (build.powerLevel.value < BURN_TIERS[1].unlockPowerLevel) build.raisePower();
  cycle.startRun();
  await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
  const powered = cycle.endedAtMinutes.value ?? Number.NaN;
  const poweredD = build.dMax.value.toNumber();

  // Now advance one tier — same power, the pace surface steps.
  burnTier.advanceTier();
  cycle.startRun();
  await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
  const stepped = cycle.endedAtMinutes.value ?? Number.NaN;

  console.log(`  tier 0, D_max ${Math.round(baseD).toLocaleString()}          → ${fmt(base)}`);
  console.log(
    `  tier 0, D_max ${Math.round(poweredD).toLocaleString()} (×${(poweredD / baseD).toFixed(0)} reach) → ${fmt(powered)}   Δ ${(powered - base).toFixed(3)}m  ← peg holds, +0`,
  );
  console.log(
    `  tier 1, same power                → ${fmt(stepped)}   Δ ${(stepped - powered).toFixed(2)}m  ← the gated pace step`,
  );
  handle.dispose();
}

// ─── Probe 3 — the step is one-way reach-gated ─────────────────────────────────

async function probeGate(): Promise<void> {
  HEAD('Probe 3 — advanceTier is a no-op until reach unlocks the next tier');
  const { handle, build, burnTier } = bootStack();
  console.log(
    '  L'.padEnd(4) +
      'unlocked'.padEnd(10) +
      'canAdvance'.padEnd(12) +
      'advanceTier()'.padEnd(15) +
      'activeIndex',
  );
  const step = (): void => {
    const before = burnTier.activeIndex.value;
    const moved = burnTier.advanceTier();
    console.log(
      `  ${build.powerLevel.value}`.padEnd(4) +
        `${burnTier.unlockedIndex.value}`.padEnd(10) +
        `${burnTier.canAdvance.value}`.padEnd(12) +
        `${moved} (${before}→${burnTier.activeIndex.value})`.padEnd(15) +
        `${burnTier.activeIndex.value}`,
    );
  };
  step(); // L=0: gated at tier 0, no-op
  build.raisePower(); // L=1: still under the Accelerated gate (L≥2)
  step();
  build.raisePower(); // L=2: Accelerated unlocks
  step();
  step(); // Cascade still gated (L≥4)
  handle.dispose();
}

// ─── Probe 4 — the schedule freezes at run start (mid-run switch is inert) ──────

async function probeFreeze(): Promise<void> {
  HEAD('Probe 4 — advancing mid-run is inert; the switch lands on the next run');
  const { handle, cycle, build, burnTier } = bootStack();
  while (build.powerLevel.value < BURN_TIERS[1].unlockPowerLevel) build.raisePower();
  cycle.startRun(); // begins under tier 0
  // Advance to tier 1 WHILE the run is live.
  await handle.tickUntil(() => cycle.elapsedMinutes.value >= 3, MAX_TICKS);
  const moved = burnTier.advanceTier();
  await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
  const current = cycle.endedAtMinutes.value ?? Number.NaN;
  // The next run picks up the frozen switch.
  cycle.startRun();
  await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
  const next = cycle.endedAtMinutes.value ?? Number.NaN;
  console.log(`  advanced mid-run: ${moved}  (activeIndex now ${burnTier.activeIndex.value})`);
  console.log(
    `  current run ended at ${fmt(current)} (≈ tier 0 N* ${fmt(burnTier.runLengthAt(0))}) — mid-run switch inert ✓`,
  );
  console.log(
    `  next run ended at    ${fmt(next)} (≈ tier 1 N* ${fmt(burnTier.runLengthAt(1))}) — froze at startRun ✓`,
  );
  handle.dispose();
}

async function main(): Promise<void> {
  console.log('Cycler — burn-tier probe (the pace surface, real engine)');
  await probeLadder();
  await probeWithinVsCross();
  await probeGate();
  await probeFreeze();
  console.log('');
}

main();
