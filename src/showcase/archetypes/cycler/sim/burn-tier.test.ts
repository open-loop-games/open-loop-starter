/**
 * Cycler burn-tier layer — Lane-4 lock (IDENTITY § Balance model, lane 4).
 *
 * Pins what `balance/burn-tier-probe.ts` MEASURED against the real assembled stack:
 * the escalation-content pace surface (`addBurnTier`). Behavioral + shape
 * invariants (not magnitude-as-target) — they stay true across retunes:
 *   • each tier's realized run length matches its closed form N*(tier) = τ_setup +
 *     T_g·log_g(H) (the shipping burn realizes the projection);
 *   • WITHIN a tier the peg holds run length flat as reach climbs (+0 on
 *     raisePower); only CROSSING a tier moves it — the pace step;
 *   • the step is one-way reach-gated: advanceTier is a no-op until L reaches the
 *     next tier's unlock gate, and it never runs past the last tier;
 *   • the schedule freezes at run start — advancing mid-run leaves the current run
 *     at its tier and lands the switch on the next run.
 *
 * Provenance (2026-07, burn-tier-probe.ts at shipped constants H=4, τ_setup=4,
 * BURN_TIERS g/T_g = 2/6, 3/6, 4/6, 6/6 at gates L≥ 0,2,4,6): tier run lengths
 * 16.00 / 11.57 / 10.00 / 8.64 m, max drift 0.105% (the ≤1 dt overshoot at 1s
 * tick). If those constants are retuned, re-run the probe and update this note.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, cycle, build, burnTier, tickUntil } from './harness';
import { BURN_TIERS } from '../data/threat';

/** Drive a booted engine to the Merge bell and return the measured run length. */
async function runLength(): Promise<number> {
  const c = cycle();
  await tickUntil(() => c.runState.value === 'ended');
  return c.endedAtMinutes.value!;
}

describe('burn-tier — the base run is unchanged (tier 0 is the shipped default)', () => {
  beforeEach(() => boot());

  it('starts at tier 0 with the base burn schedule', () => {
    const bt = burnTier();
    expect(bt.activeIndex.value).toBe(0);
    expect(bt.tierCount).toBe(BURN_TIERS.length);
    expect(bt.schedule()).toEqual({
      escalationBase: BURN_TIERS[0].escalationBase,
      escalationTimescale: BURN_TIERS[0].escalationTimescale,
    });
  });
});

describe('burn-tier — each tier realizes its closed-form run length N*(tier)', () => {
  beforeEach(() => boot());

  it('walking up the ladder, every tier lands at its authored N*', async () => {
    const bt = burnTier();
    const b = build();
    for (let i = 0; i < BURN_TIERS.length; i++) {
      while (b.powerLevel.value < BURN_TIERS[i].unlockPowerLevel) b.raisePower();
      while (bt.activeIndex.value < i) bt.advanceTier();
      cycle().startRun(); // freezes the active tier's (g, T_g)
      expect(bt.activeIndex.value).toBe(i);
      const measured = await runLength();
      // Shipping burn == the closed form (retune-robust: predicted recomputes from
      // the same constants). toBeCloseTo(_, 1) ⇒ within 0.05m.
      expect(measured).toBeCloseTo(bt.runLengthAt(i), 1);
    }
  });

  it('deeper (steeper-g) tiers give strictly shorter runs', async () => {
    const bt = burnTier();
    expect(bt.runLengthAt(0)).toBeGreaterThan(bt.runLengthAt(1));
    expect(bt.runLengthAt(1)).toBeGreaterThan(bt.runLengthAt(2));
    expect(bt.runLengthAt(2)).toBeGreaterThan(bt.runLengthAt(3));
  });
});

describe('burn-tier — power WITHIN a tier is +0; crossing a tier is the step', () => {
  beforeEach(() => boot());

  it('raising reach without advancing holds run length flat; advancing steps it', async () => {
    const bt = burnTier();
    const b = build();

    cycle().startRun();
    const base = await runLength();
    const baseD = b.dMax.value.toNumber();

    // Raise reach to the next gate but DON'T advance — still tier 0, peg holds.
    while (b.powerLevel.value < BURN_TIERS[1].unlockPowerLevel) b.raisePower();
    cycle().startRun();
    const powered = await runLength();
    expect(b.dMax.value.toNumber()).toBeGreaterThan(baseD); // reach genuinely climbed
    expect(bt.activeIndex.value).toBe(0); // still tier 0
    expect(Math.abs(powered - base)).toBeLessThan(0.05); // +0 run length under the peg

    // Same power — advance one tier. The pace surface steps run length down.
    expect(bt.advanceTier()).toBe(true);
    expect(bt.activeIndex.value).toBe(1);
    cycle().startRun();
    const stepped = await runLength();
    expect(stepped).toBeCloseTo(bt.runLengthAt(1), 1);
    expect(base - stepped).toBeGreaterThan(1); // a clear, discrete step (not drift)
  });
});

describe('burn-tier — the step is one-way reach-gated', () => {
  beforeEach(() => boot());

  it('advanceTier is a no-op until L reaches the next tier gate', () => {
    const bt = burnTier();
    const b = build();

    // Tier 1 gates at L ≥ its unlock; below it the step is refused.
    expect(b.powerLevel.value).toBe(0);
    expect(bt.canAdvance.value).toBe(false);
    expect(bt.advanceTier()).toBe(false);
    expect(bt.activeIndex.value).toBe(0);
    expect(bt.nextUnlockPowerLevel.value).toBe(BURN_TIERS[1].unlockPowerLevel);

    // One level shy of the gate — still refused.
    while (b.powerLevel.value < BURN_TIERS[1].unlockPowerLevel - 1) b.raisePower();
    expect(bt.canAdvance.value).toBe(false);
    expect(bt.advanceTier()).toBe(false);

    // At the gate — it unlocks and advances exactly once.
    b.raisePower();
    expect(bt.unlockedIndex.value).toBe(1);
    expect(bt.canAdvance.value).toBe(true);
    expect(bt.advanceTier()).toBe(true);
    expect(bt.activeIndex.value).toBe(1);
    // Tier 2 is gated again — the ladder is one rung per reach threshold.
    expect(bt.canAdvance.value).toBe(false);
    expect(bt.advanceTier()).toBe(false);
  });

  it('never advances past the last tier', () => {
    const bt = burnTier();
    const b = build();
    // Force reach far past every gate, then exhaust the ladder.
    for (let i = 0; i < BURN_TIERS[BURN_TIERS.length - 1].unlockPowerLevel + 2; i++) b.raisePower();
    while (bt.advanceTier()) {
      /* climb to the top */
    }
    expect(bt.activeIndex.value).toBe(BURN_TIERS.length - 1);
    expect(bt.canAdvance.value).toBe(false);
    expect(bt.nextUnlockPowerLevel.value).toBeNull();
    expect(bt.advanceTier()).toBe(false); // idempotent at the ceiling
  });
});

describe('burn-tier — the schedule freezes at run start', () => {
  beforeEach(() => boot());

  it('advancing mid-run is inert; the switch lands on the next run', async () => {
    const bt = burnTier();
    const b = build();
    while (b.powerLevel.value < BURN_TIERS[1].unlockPowerLevel) b.raisePower();

    const c = cycle();
    c.startRun(); // begins under tier 0
    await tickUntil(() => c.elapsedMinutes.value >= 3);
    expect(bt.advanceTier()).toBe(true); // switch to tier 1 mid-run
    expect(bt.activeIndex.value).toBe(1);

    await tickUntil(() => c.runState.value === 'ended');
    // The live run kept tier 0's schedule — the mid-run switch was inert.
    expect(c.endedAtMinutes.value!).toBeCloseTo(bt.runLengthAt(0), 1);

    // The next run freezes the switched-to tier at startRun.
    c.startRun();
    const next = await runLength();
    expect(next).toBeCloseTo(bt.runLengthAt(1), 1);
  });
});
