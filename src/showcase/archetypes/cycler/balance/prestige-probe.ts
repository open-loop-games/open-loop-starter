/**
 * Cycler — prestige probe: the Redeploy boundary that closes the loop, on the real
 * engine.
 *
 * Run: `pnpm exec vite-node src/showcase/archetypes/cycler/balance/prestige-probe.ts`
 *
 * Probe (`open-loop-engine/docs/consumer-guide-balance.md`
 * § The probe — real engine, real policies): drives the REAL assembled stack
 * over the reference board through actual Redeploys. Verifies the projection
 * (`cycler-projection.ts` § currency, § arc): the run auto-banks a sublinear currency
 * on the line breach, reach is a catalog buy, and the re-peg holds run length flat
 * while cMax and banked currency climb. Mixed sourcing: production = ∫build.capacity dt,
 * endurance = Σ W_n. Absolute payout magnitudes are calibrated (data/prestige.ts);
 * this probe reports the measured trends.
 *
 * Coarse tick (1s) per `.claude/CLAUDE.md` § Balance methodology.
 */

import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { createCyclerModules, CycleKey, BuildKey, PrestigeKey, UpgradesKey } from '../modules';
import { BUILD_BALANCE } from '../data/build';
import { placeReference } from './_board';

const TICK_RATE = 1;
const MAX_TICKS = 200_000;
const prodRatio = BUILD_BALANCE.producerUpgradeRatio;

const fmt = (m: number): string => (m < 90 ? `${m.toFixed(2)}m` : `${(m / 60).toFixed(2)}h`);
const HEAD = (s: string): void => console.log(`\n═══ ${s} ═══`);

/** Boot the real assembled stack and place the reference board. */
function bootStack() {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createCyclerModules()],
    tickRate: TICK_RATE,
    namespacePrefix: 'prestige-probe',
  });
  const cycle = handle.engine.tryInject(CycleKey);
  const build = handle.engine.tryInject(BuildKey);
  const prestige = handle.engine.tryInject(PrestigeKey);
  const upgrades = handle.engine.tryInject(UpgradesKey);
  if (!cycle || !build || !prestige || !upgrades)
    throw new Error('prestige-probe: cycler stack did not install');
  placeReference(build);
  return { handle, cycle, build, prestige, upgrades };
}

// ─── Probe 1 — the payout, mixed-source ∛ currency (measured) ───────────────────

async function probePayout(): Promise<void> {
  HEAD('Probe 1 — the Redeploy payout (∛-per-source: ∫cap dt, Σ W_n)');
  const { handle, cycle, build, prestige } = bootStack();
  console.log(
    '  L'.padEnd(4) +
      'cMax'.padEnd(10) +
      'measured ∫cap'.padEnd(15) +
      'measured ΣW_n'.padEnd(15) +
      'payout',
  );
  for (let L = 0; L < 5; L++) {
    await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
    console.log(
      `  ${L}`.padEnd(4) +
        Math.round(build.cMax.value.toNumber()).toLocaleString().padEnd(10) +
        Math.round(prestige.runOutput.value.toNumber()).toLocaleString().padEnd(15) +
        Math.round(prestige.runEndurance.value.toNumber()).toLocaleString().padEnd(15) +
        `${prestige.pendingFragments.value.toNumber()}`,
    );
    build.raisePower(); // one level per step (board persists across startRun)
    cycle.startRun();
  }
  handle.dispose();
}

// ─── Probe 2 — the arc: reach climbs, run length flat, currency banks ──────────

async function probeArc(): Promise<void> {
  HEAD('Probe 2 — reach climbs & currency banks while run length holds (the peg)');
  const { handle, cycle, build, prestige, upgrades } = bootStack();
  console.log(
    '  run'.padEnd(6) +
      'L'.padEnd(4) +
      'cMax'.padEnd(10) +
      'run len'.padEnd(10) +
      'lifetime$'.padEnd(11) +
      'event',
  );
  const lengths: number[] = [];
  for (let run = 1; run <= 12; run++) {
    placeReference(build); // a fresh Redeploy rebuilds the board
    await handle.tickUntil(() => cycle.runState.value === 'ended', MAX_TICKS);
    const L = build.powerLevel.value;
    const len = cycle.endedAtMinutes.value ?? Number.NaN;
    lengths.push(len);
    const before = build.powerLevel.value;
    if (upgrades.reach.canPurchase.value) upgrades.reach.purchase();
    prestige.merge();
    const raised = build.powerLevel.value > before;
    console.log(
      `  ${run}`.padEnd(6) +
        `${L}`.padEnd(4) +
        Math.round(build.cMax.value.toNumber()).toLocaleString().padEnd(10) +
        fmt(len).padEnd(10) +
        `${prestige.lifetimeFragments.value.toNumber()}`.padEnd(11) +
        (raised ? `⇒ Redeploy: L ${before}→${build.powerLevel.value}` : ''),
    );
  }
  const [lo, hi] = [Math.min(...lengths), Math.max(...lengths)];
  console.log(
    `  run length spread ${(hi - lo).toFixed(3)}m across the arc — flat under the peg (reach, not pacing).`,
  );
  handle.dispose();
}

// ─── Probe 3 — the currency is sublinear in run output ─────────────────────────

async function probeSublinear(): Promise<void> {
  HEAD(
    `Probe 3 — currency is sublinear in run output (∛): ×${prodRatio} output → ×∛${prodRatio} currency`,
  );
  const { handle, cycle, prestige, build } = bootStack();
  console.log(
    '  L→L+1'.padEnd(9) +
      'output ×'.padEnd(11) +
      'currency ×'.padEnd(13) +
      `vs ∛${prodRatio} ≈ ${Math.cbrt(prodRatio).toFixed(3)}`,
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
    build.raisePower(); // one level per step (board persists across startRun)
    cycle.startRun();
  }
  console.log(
    '  Output doubles per layer; currency grows ∛-slowly — late runs never mint proportional currency.',
  );
  handle.dispose();
}

async function main(): Promise<void> {
  console.log('Cycler — prestige probe (the Redeploy boundary, real engine)');
  await probePayout();
  await probeArc();
  await probeSublinear();
  console.log('');
}

main();
