/**
 * Cycler prestige layer — wave-model lock (IDENTITY § Balance model; studio/
 * open-loop-starter#21 leaf 3). Pins the Redeploy boundary that closes the loop.
 * Behavioral + shape invariants (not magnitude-as-target) — they stay true across
 * retunes:
 *   • the run auto-pays-out on the line breach (Redeploy bell, not a fail state);
 *   • merge() re-pegs to the next run WITHOUT buying power (reach is a catalog buy
 *     now — see `sim/upgrades.test.ts` for the reach-climb arc);
 *   • currency is sublinear in run output (∛-per-source), mixed sourcing
 *     (production = ∫build.capacity dt, endurance = Σ W_n).
 *
 * Runs place the reference board (`placeDefense`); merge() clears the board (a fresh
 * Redeploy rebuilds), so the arc re-places each cycle. Absolute payout magnitudes are
 * calibrated so a competent first run banks the quorum (data/prestige.ts); the exact
 * scale values are measured, never authored (multiverse-hr#17).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, cycle, build, prestige, placeDefense, tickUntil } from './harness';
import { BUILD_BALANCE } from '../data/build';
import { PRESTIGE_BALANCE } from '../data/prestige';

/** Drive a booted, board-placed engine to the breach. Auto-bank fires on the breach tick. */
async function runToEnd() {
  const c = cycle();
  await tickUntil(() => c.runState.value === 'ended', 20_000);
  return c;
}

describe('prestige — the run auto-pays-out on the breach (Redeploy bell, not a fail state)', () => {
  beforeEach(() => boot());

  it('banks the pending payout the moment the line breaches, with no merge() call', async () => {
    const p = prestige();
    placeDefense();
    expect(p.fragments.value.toNumber()).toBe(0); // nothing banked pre-run

    await runToEnd();

    // Auto-bank: the breach paid out. Wallet == what the run accrued.
    const payout = p.pendingFragments.value;
    expect(payout.gt(0)).toBe(true);
    expect(p.fragments.value.eq(payout)).toBe(true);
    expect(p.lifetimeFragments.value.eq(payout)).toBe(true);
    expect(p.mergeCount.value).toBe(0); // paid out WITHOUT a merge
  });

  it('a competent first run banks exactly the quorum (the loop is affordable)', async () => {
    const p = prestige();
    placeDefense();
    await runToEnd();
    // Calibrated 2+1 split == quorum, so the first reach buy (cost == quorum at L=0)
    // is affordable. The reach cost + affordability is locked in sim/upgrades.test.ts.
    expect(p.fragments.value.toNumber()).toBe(PRESTIGE_BALANCE.mergeQuorum);
  });
});

describe('prestige — merge() re-pegs to the next run (reach is a separate catalog buy)', () => {
  beforeEach(() => boot());

  it('is a no-op before the bell rings (the run must breach first)', () => {
    const p = prestige();
    expect(cycle().runState.value).toBe('running');
    expect(p.merge()).toBe(false);
    expect(build().powerLevel.value).toBe(0);
    expect(p.mergeCount.value).toBe(0);
  });

  it('re-pegs and restarts the run without touching power', async () => {
    const p = prestige();
    const b = build();
    placeDefense();
    await runToEnd();
    const merged = p.merge();

    expect(merged).toBe(true);
    expect(b.powerLevel.value).toBe(0); // merge no longer buys power — that's the catalog's job
    expect(cycle().runState.value).toBe('running'); // re-pegged, clock restarted
    expect(p.mergeCount.value).toBe(1);
  });
});

describe('prestige — the arc: currency banks while run length holds flat', () => {
  beforeEach(() => boot());

  it('over many runs lifetime currency strictly climbs; run length never moves', async () => {
    const p = prestige();
    const lengths: number[] = [];
    let lastLifetime = 0;

    for (let run = 0; run < 8; run++) {
      placeDefense(); // a fresh Redeploy rebuilds the board
      const c = await runToEnd();
      lengths.push(c.endedAtMinutes.value!);
      // Lifetime currency is monotone climbing every run (banked payout).
      const lifetime = p.lifetimeFragments.value.toNumber();
      expect(lifetime).toBeGreaterThan(lastLifetime);
      lastLifetime = lifetime;
      p.merge(); // re-peg for the next run (no reach buy — C holds, so does run length)
    }

    // Run length is flat across the whole arc (the peg): all identical.
    const [lo, hi] = [Math.min(...lengths), Math.max(...lengths)];
    expect(hi - lo).toBeLessThan(0.1);
  });
});

describe('prestige — currency is sublinear in run output (∛-per-source)', () => {
  beforeEach(() => boot());

  it('doubling run output multiplies the payout by ≤ ratio (never proportional)', async () => {
    const p = prestige();
    const b = build();
    const ratio = BUILD_BALANCE.producerUpgradeRatio;
    placeDefense();
    let prevOut = Number.NaN;
    let prevPay = Number.NaN;

    for (let L = 0; L < 5; L++) {
      await runToEnd();
      const out = p.runOutput.value.toNumber();
      const pay = p.pendingFragments.value.toNumber();
      if (L > 0) {
        expect(out / prevOut).toBeCloseTo(ratio, 1); // output doubles per level
        expect(pay / prevPay).toBeLessThanOrEqual(ratio); // currency grows slower — sublinear
      }
      prevOut = out;
      prevPay = pay;
      b.raisePower(); // one level per step so capacity (and output) doubles
      cycle().startRun(); // re-peg; board persists (startRun doesn't clear it)
    }
  });

  it('the payout is the cbrt-per-source sum of the two run accumulators', async () => {
    const p = prestige();
    placeDefense();
    await runToEnd();
    // pendingFragments == fragmentsFor(∫cap dt, Σ W_n): summed per source, not pooled.
    const expected = p.fragmentsFor(p.runOutput.value, p.runEndurance.value);
    expect(p.pendingFragments.value.eq(expected)).toBe(true);
  });
});
