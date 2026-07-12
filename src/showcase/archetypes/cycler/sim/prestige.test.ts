/**
 * Cycler prestige layer — Lane-4 lock (IDENTITY § Balance model, lane 4).
 *
 * Pins what `balance/prestige-probe.ts` MEASURED against the real assembled stack:
 * the Merge boundary that closes the loop. Behavioral + shape invariants (not
 * magnitude-as-target) — they stay true across retunes:
 *   • the run auto-pays-out on the crossing (Merge bell, not a fail state);
 *   • a Merge buys reach and re-pegs to +0 run length (run length flat across
 *     merges while D_max + banked currency climb);
 *   • currency is sublinear in run output (∛-per-source).
 *
 * Provenance (2026-07, prestige-probe.ts at shipped constants H=4, g=2, T_g=6,
 * τ_setup=4; Sp=2500, Ss=5000, quorum=3): first run banks 3 = quorum (a 2+1
 * split), D_max climbs ×16 over 12 runs at 0.00% run-length drift, currency grows
 * ∛2 ≈ 1.26/layer. If those constants are retuned, re-run the probe and update
 * the one measured number pinned below (the first-run payout == quorum).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, cycle, build, prestige, tickUntil } from './harness';
import { BUILD_BALANCE } from '../data/build';
import { PRESTIGE_BALANCE } from '../data/prestige';
import { UPGRADE_BALANCE } from '../data/upgrades';

/** Drive a booted engine to the Merge bell. Auto-bank fires on the crossing tick. */
async function runToEnd() {
  const c = cycle();
  await tickUntil(() => c.runState.value === 'ended');
  return c;
}

describe('prestige — the run auto-pays-out on the crossing (Merge bell, not a fail state)', () => {
  beforeEach(() => boot());

  it('banks the pending payout the moment the run ends, with no merge() call', async () => {
    const p = prestige();
    expect(p.fragments.value.toNumber()).toBe(0); // nothing banked pre-run

    await runToEnd();

    // Auto-bank: the ended crossing paid out. Wallet == what the run accrued.
    const payout = p.pendingFragments.value;
    expect(payout.gt(0)).toBe(true);
    expect(p.fragments.value.eq(payout)).toBe(true);
    expect(p.lifetimeFragments.value.eq(payout)).toBe(true);
    expect(p.mergeCount.value).toBe(0); // paid out WITHOUT a merge
  });

  it('a competent first run banks exactly the quorum (the loop is affordable)', async () => {
    const p = prestige();
    await runToEnd();
    // Measured provenance: the 2+1 first-merge split == quorum, so the first
    // Merge can always afford the L=0 power level (nextPowerCost == quorum).
    expect(p.fragments.value.toNumber()).toBe(PRESTIGE_BALANCE.mergeQuorum);
    expect(p.nextPowerCost.value.toNumber()).toBe(PRESTIGE_BALANCE.mergeQuorum);
    expect(p.canRaisePower.value).toBe(true);
  });
});

describe('prestige — merge() buys reach and re-pegs to +0 run length', () => {
  beforeEach(() => boot());

  it('is a no-op before the bell rings (the run must end first)', () => {
    const p = prestige();
    expect(cycle().runState.value).toBe('running');
    expect(p.merge()).toBe(false);
    expect(build().powerLevel.value).toBe(0);
    expect(p.mergeCount.value).toBe(0);
  });

  it('raises D_max ×ratio, spends the cost, and restarts the run', async () => {
    const p = prestige();
    const b = build();
    await runToEnd();
    const d0 = b.dMax.value;
    const cost = p.nextPowerCost.value;
    const raised = p.merge();

    expect(raised).toBe(true);
    expect(b.powerLevel.value).toBe(1);
    expect(b.dMax.value.div(d0).toNumber()).toBeCloseTo(BUILD_BALANCE.producerUpgradeRatio, 6);
    expect(p.fragments.value.toNumber()).toBe(PRESTIGE_BALANCE.mergeQuorum - cost.toNumber());
    expect(cycle().runState.value).toBe('running'); // re-pegged, clock restarted
    expect(p.mergeCount.value).toBe(1);
  });

  it('the re-pegged run lands at the same N* despite the larger D_max (reach, not pacing)', async () => {
    const base = (await runToEnd()).endedAtMinutes.value!;

    const p = prestige();
    expect(p.merge()).toBe(true); // raise power (D_max ×ratio) + re-peg
    expect(build().powerLevel.value).toBe(1);
    const powered = (await runToEnd()).endedAtMinutes.value!;

    expect(Math.abs(powered - base)).toBeLessThan(0.05); // +0 run length under the peg
  });
});

describe('prestige — the arc: reach + currency climb while run length holds flat', () => {
  beforeEach(() => boot());

  it('over many merges D_max and lifetime currency strictly climb; run length never moves', async () => {
    const p = prestige();
    const b = build();
    const lengths: number[] = [];
    const dMaxes: number[] = [];
    let lastLifetime = 0;

    for (let run = 0; run < 8; run++) {
      const c = await runToEnd();
      lengths.push(c.endedAtMinutes.value!);
      dMaxes.push(b.dMax.value.toNumber());
      // Lifetime currency is monotone non-decreasing every run (banked payout).
      const lifetime = p.lifetimeFragments.value.toNumber();
      expect(lifetime).toBeGreaterThan(lastLifetime);
      lastLifetime = lifetime;
      p.merge(); // buy reach when affordable, re-peg
    }

    // Run length is flat across the whole arc (the peg): all within 0.1m.
    const [lo, hi] = [Math.min(...lengths), Math.max(...lengths)];
    expect(hi - lo).toBeLessThan(0.1);
    // D_max genuinely climbed — reach, several distinct increasing tiers.
    expect(dMaxes[dMaxes.length - 1]).toBeGreaterThan(dMaxes[0]);
    expect(new Set(dMaxes).size).toBeGreaterThanOrEqual(3);
  });
});

describe('prestige — currency is sublinear in run output (∛-per-source)', () => {
  beforeEach(() => boot());

  it('doubling run output multiplies the payout by ≤ ratio (never proportional)', async () => {
    const p = prestige();
    const b = build();
    const ratio = BUILD_BALANCE.producerUpgradeRatio;
    let prevOut = Number.NaN;
    let prevPay = Number.NaN;

    for (let L = 0; L < 5; L++) {
      await runToEnd();
      const out = p.runOutput.value.toNumber();
      const pay = p.pendingFragments.value.toNumber();
      if (L > 0) {
        expect(out / prevOut).toBeCloseTo(ratio, 2); // output doubles per level
        expect(pay / prevPay).toBeLessThanOrEqual(ratio); // currency grows slower — sublinear
      }
      prevOut = out;
      prevPay = pay;
      b.raisePower(); // force one level per step so D_max (and output) doubles
      cycle().startRun();
    }
  });

  it('the payout is the cbrt-per-source sum of the two run accumulators', async () => {
    const p = prestige();
    await runToEnd();
    // pendingFragments == fragmentsFor(∫cap dt, ∫burn dt): summed per source, not
    // pooled. The transform is the sublinearity's mechanism.
    const expected = p.fragmentsFor(p.runOutput.value, p.runEndurance.value);
    expect(p.pendingFragments.value.eq(expected)).toBe(true);
    // And the next power cost is quorum · ratio^L (data/upgrades.ts).
    expect(p.nextPowerCost.value.toNumber()).toBe(
      PRESTIGE_BALANCE.mergeQuorum *
        Math.pow(UPGRADE_BALANCE.powerUpgradeCostRatio, build().powerLevel.value),
    );
  });
});
