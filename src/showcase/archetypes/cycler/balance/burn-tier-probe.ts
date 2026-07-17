/**
 * Cycler — salvo-posture probe: the per-wave pace surface, on the real engine.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/burn-tier-probe.ts`
 *
 * Lane 3 (frontier `docs/balance-process.md` § probe): drives the REAL assembled stack
 * over the reference board across the salvo-posture ladder. Verifies the Lane-1
 * projection (`cycler-projection.ts`):
 *   1. deeper (steeper-g) postures give strictly shorter runs;
 *   2. crossing a posture steps run length while raising power WITHIN one does not
 *      (the peg holds flat — the decoupling);
 *   3. the step is one-way reach-gated: `advanceTier` is a no-op until L reaches the
 *      next posture's gate.
 *
 * Coarse tick (1s) per `.claude/CLAUDE.md` § Balance methodology.
 */

import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { createCyclerModules, CycleKey, BuildKey, BurnTierKey } from '../modules';
import { SALVO_POSTURES } from '../data/defense';
import { placeReference } from './_board';

const TICK_RATE = 1;
const MAX_TICKS = 200_000;

const fmt = (m: number): string => `${m.toFixed(2)}m`;
const HEAD = (s: string): void => console.log(`\n═══ ${s} ═══`);

/** Boot the real assembled stack and place the reference board. */
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
  placeReference(build);
  return { handle, cycle, build, burnTier };
}

// ─── Probe 1 — steeper postures give strictly shorter runs ─────────────────────

async function probeLadder(): Promise<void> {
  HEAD('Probe 1 — measured run length is non-increasing as the salvo posture steepens');
  const { handle, cycle, build, burnTier } = bootStack();
  console.log(
    '  posture'.padEnd(14) +
      'g'.padEnd(5) +
      'gate L≥'.padEnd(9) +
      'crossing (waves)'.padEnd(18) +
      'measured',
  );
  for (let i = 0; i < SALVO_POSTURES.length; i++) {
    while (build.powerLevel.value < SALVO_POSTURES[i].unlockPowerLevel) build.raisePower();
    while (burnTier.activeIndex.value < i) burnTier.advanceTier();
    cycle.startRun(); // freezes the now-active posture's g
    await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
    console.log(
      `  ${SALVO_POSTURES[i].label}`.padEnd(14) +
        `${SALVO_POSTURES[i].salvoBase}`.padEnd(5) +
        `${SALVO_POSTURES[i].unlockPowerLevel}`.padEnd(9) +
        `${burnTier.runLengthAt(i).toFixed(2)}`.padEnd(18) +
        fmt(cycle.endedAtMinutes.value ?? Number.NaN),
    );
  }
  console.log('  Steeper g ⇒ shorter run (the high-leverage pace lever).');
  handle.dispose();
}

// ─── Probe 2 — within a posture the peg holds; only crossing one moves run length ─

async function probeWithinVsCross(): Promise<void> {
  HEAD('Probe 2 — power WITHIN a posture is +0 run length; crossing one is the step');
  const { handle, cycle, build, burnTier } = bootStack();
  cycle.startRun();
  await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
  const base = cycle.endedAtMinutes.value ?? Number.NaN;
  const baseC = build.cMax.value.toNumber();

  // Raise power to the next gate but DON'T advance — still posture 0.
  while (build.powerLevel.value < SALVO_POSTURES[1].unlockPowerLevel) build.raisePower();
  cycle.startRun();
  await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
  const powered = cycle.endedAtMinutes.value ?? Number.NaN;
  const poweredC = build.cMax.value.toNumber();

  // Now advance one posture — same power, the pace surface steps.
  burnTier.advanceTier();
  cycle.startRun();
  await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
  const stepped = cycle.endedAtMinutes.value ?? Number.NaN;

  console.log(`  posture 0, cMax ${Math.round(baseC).toLocaleString()}          → ${fmt(base)}`);
  console.log(
    `  posture 0, cMax ${Math.round(poweredC).toLocaleString()} (×${(poweredC / baseC).toFixed(0)} reach) → ${fmt(powered)}   Δ ${(powered - base).toFixed(3)}m  ← peg holds, +0`,
  );
  console.log(
    `  posture 1, same power                → ${fmt(stepped)}   Δ ${(stepped - powered).toFixed(2)}m  ← the gated pace step`,
  );
  handle.dispose();
}

// ─── Probe 3 — the step is one-way reach-gated ─────────────────────────────────

async function probeGate(): Promise<void> {
  HEAD('Probe 3 — advanceTier is a no-op until reach unlocks the next posture');
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
  step(); // L=0: gated at posture 0, no-op
  build.raisePower(); // L=1: still under the Accelerated gate (L≥2)
  step();
  build.raisePower(); // L=2: Accelerated unlocks
  step();
  step(); // Cascade still gated (L≥4)
  handle.dispose();
}

async function main(): Promise<void> {
  console.log('Cycler — salvo-posture probe (the pace surface, real engine)');
  await probeLadder();
  await probeWithinVsCross();
  await probeGate();
  console.log('');
}

main();
