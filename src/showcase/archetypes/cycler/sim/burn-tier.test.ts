/**
 * Cycler salvo-posture layer — wave-model lock (IDENTITY § Balance model; studio/
 * open-loop-starter#21 leaf 3 contract flip). Pins the pace surface (`addBurnTier`),
 * now PER-WAVE: each posture authors its own salvo base `g`. Behavioral + shape
 * invariants (not magnitude-as-target) — they stay true across retunes:
 *   • deeper (steeper-g) postures give strictly shorter runs (measured + closed-form);
 *   • WITHIN a posture the peg holds run length flat as reach climbs (+0 on
 *     raisePower); only CROSSING a posture moves it — the pace step;
 *   • the step is one-way reach-gated: advanceTier is a no-op until L reaches the next
 *     posture's unlock gate, and it never runs past the last posture;
 *   • the schedule freezes at run start — advancing mid-run leaves the current run at
 *     its posture and lands the switch on the next run.
 *
 * Runs place a competent reference board (`placeDefense`) so they reach the pegged
 * crossing + Δ_wall tail; absolute run-length magnitudes are measured, never authored
 * (multiverse-hr#17). `runLengthAt` is the closed-form crossing in WAVES (tail-exclusive).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, cycle, build, burnTier, placeDefense, tickUntil } from './harness';
import { SALVO_POSTURES } from '../data/defense';

/** Drive a booted, board-placed engine to the line breach and return the run length (minutes). */
async function runLength(): Promise<number> {
  const c = cycle();
  await tickUntil(() => c.runState.value === 'ended', 20_000);
  return c.endedAtMinutes.value!;
}

describe('salvo posture — the base run is unchanged (posture 0 is the shipped default)', () => {
  beforeEach(() => boot());

  it('starts at posture 0 with the base per-wave salvo schedule', () => {
    const bt = burnTier();
    expect(bt.activeIndex.value).toBe(0);
    expect(bt.tierCount).toBe(SALVO_POSTURES.length);
    expect(bt.schedule()).toEqual({ salvoBase: SALVO_POSTURES[0].salvoBase });
  });
});

describe('salvo posture — deeper (steeper-g) postures give strictly shorter runs', () => {
  beforeEach(() => boot());

  it('closed-form crossing decreases with steeper g', () => {
    const bt = burnTier();
    expect(bt.runLengthAt(0)).toBeGreaterThan(bt.runLengthAt(1));
    expect(bt.runLengthAt(1)).toBeGreaterThan(bt.runLengthAt(2));
    expect(bt.runLengthAt(2)).toBeGreaterThan(bt.runLengthAt(3));
  });

  it('walking up the ladder, measured runs are non-increasing and the steepest is strictly shortest', async () => {
    const bt = burnTier();
    const b = build();
    placeDefense();
    const measured: number[] = [];
    for (let i = 0; i < SALVO_POSTURES.length; i++) {
      while (b.powerLevel.value < SALVO_POSTURES[i].unlockPowerLevel) b.raisePower();
      while (bt.activeIndex.value < i) bt.advanceTier();
      expect(bt.activeIndex.value).toBe(i);
      cycle().startRun(); // freezes the active posture's g
      measured.push(await runLength());
    }
    // Non-increasing (integer-wave quantization lets adjacent steep postures tie)…
    for (let i = 1; i < measured.length; i++)
      expect(measured[i]).toBeLessThanOrEqual(measured[i - 1]);
    // …and the steepest posture is strictly shorter than the base.
    expect(measured[measured.length - 1]).toBeLessThan(measured[0]);
  });
});

describe('salvo posture — power WITHIN a posture is +0; crossing a posture is the step', () => {
  beforeEach(() => boot());

  it('raising reach without advancing holds run length flat; advancing steps it', async () => {
    const bt = burnTier();
    const b = build();
    placeDefense();

    cycle().startRun();
    const base = await runLength();
    const baseC = b.cMax.value.toNumber();

    // Raise reach to the next gate but DON'T advance — still posture 0, peg holds.
    while (b.powerLevel.value < SALVO_POSTURES[1].unlockPowerLevel) b.raisePower();
    cycle().startRun();
    const powered = await runLength();
    expect(b.cMax.value.toNumber()).toBeGreaterThan(baseC); // reach genuinely climbed
    expect(bt.activeIndex.value).toBe(0); // still posture 0
    expect(Math.abs(powered - base)).toBeLessThan(2); // +0 run length (sub-one-wave)

    // Same power — advance one posture. The pace surface steps run length down.
    expect(bt.advanceTier()).toBe(true);
    expect(bt.activeIndex.value).toBe(1);
    cycle().startRun();
    const stepped = await runLength();
    expect(base - stepped).toBeGreaterThan(1); // a clear, discrete step (not drift)
  });
});

describe('salvo posture — the step is one-way reach-gated', () => {
  beforeEach(() => boot());

  it('advanceTier is a no-op until L reaches the next posture gate', () => {
    const bt = burnTier();
    const b = build();

    expect(b.powerLevel.value).toBe(0);
    expect(bt.canAdvance.value).toBe(false);
    expect(bt.advanceTier()).toBe(false);
    expect(bt.activeIndex.value).toBe(0);
    expect(bt.nextUnlockPowerLevel.value).toBe(SALVO_POSTURES[1].unlockPowerLevel);

    // One level shy of the gate — still refused.
    while (b.powerLevel.value < SALVO_POSTURES[1].unlockPowerLevel - 1) b.raisePower();
    expect(bt.canAdvance.value).toBe(false);
    expect(bt.advanceTier()).toBe(false);

    // At the gate — it unlocks and advances exactly once.
    b.raisePower();
    expect(bt.unlockedIndex.value).toBe(1);
    expect(bt.canAdvance.value).toBe(true);
    expect(bt.advanceTier()).toBe(true);
    expect(bt.activeIndex.value).toBe(1);
    // Posture 2 is gated again — one rung per reach threshold.
    expect(bt.canAdvance.value).toBe(false);
    expect(bt.advanceTier()).toBe(false);
  });

  it('never advances past the last posture', () => {
    const bt = burnTier();
    const b = build();
    const lastGate = SALVO_POSTURES[SALVO_POSTURES.length - 1].unlockPowerLevel;
    for (let i = 0; i < lastGate + 2; i++) b.raisePower();
    while (bt.advanceTier()) {
      /* climb to the top */
    }
    expect(bt.activeIndex.value).toBe(SALVO_POSTURES.length - 1);
    expect(bt.canAdvance.value).toBe(false);
    expect(bt.nextUnlockPowerLevel.value).toBeNull();
    expect(bt.advanceTier()).toBe(false); // idempotent at the ceiling
  });
});

describe('salvo posture — the schedule freezes at run start', () => {
  beforeEach(() => boot());

  it('advancing mid-run is inert; the switch lands on the next run', async () => {
    const bt = burnTier();
    const b = build();
    placeDefense();
    while (b.powerLevel.value < SALVO_POSTURES[1].unlockPowerLevel) b.raisePower();

    const c = cycle();
    c.startRun(); // begins under posture 0
    await tickUntil(() => c.waveIndex.value >= 2, 20_000);
    expect(bt.advanceTier()).toBe(true); // switch to posture 1 mid-run
    expect(bt.activeIndex.value).toBe(1);

    await tickUntil(() => c.runState.value === 'ended', 20_000);
    const posture0Length = c.endedAtMinutes.value!;

    // The next run freezes the switched-to posture at startRun → strictly shorter.
    c.startRun();
    const posture1Length = await runLength();
    expect(posture1Length).toBeLessThan(posture0Length); // the mid-run switch only lands next run
  });
});
