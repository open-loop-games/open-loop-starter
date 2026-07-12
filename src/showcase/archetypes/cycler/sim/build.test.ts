/**
 * Cycler build module — shape-invariant spec (IDENTITY § Balance model, lane 4).
 *
 * Behavioral, not magnitude: pins WHAT the saturating capacity does, which stays
 * true across retunes. The two load-bearing claims from the multiverse-hr #17
 * correction — capacity is BOUNDED by D_max (finite board ⇒ log crossing), and
 * D_max climbs geometrically in the permanent level L (reach, not pacing) — plus
 * the integration check that the kernel crossing still lands at N* when capacity
 * flows from the live build module rather than a stub.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, cycle, getEngine, tickUntil } from './harness';
import { BuildKey, getBuild } from '../modules';
import { BUILD_BALANCE } from '../data/build';

describe('build — capacity is bounded by D_max (the finite-board saturation)', () => {
  beforeEach(() => boot());

  it('an empty board produces nothing; a full board is exactly D_max', () => {
    const b = getEngine().tryInject(BuildKey)!;
    expect(b.placed.value).toBe(0);
    expect(b.capacity.value.toNumber()).toBe(0);

    b.fillBoard();
    expect(b.placed.value).toBe(b.boardCells);
    expect(b.capacity.value.eq(b.dMax.value)).toBe(true);
  });

  it('current capacity never exceeds D_max as producers are placed', () => {
    const b = getBuild();
    for (let i = 0; i < b.boardCells + 3; i++) {
      expect(b.capacity.value.lte(b.dMax.value)).toBe(true); // bounded at every fill
      b.placeProducer();
    }
    // Placement hard-caps at the finite board — the saturation source.
    expect(b.placed.value).toBe(b.boardCells);
    expect(b.placeProducer()).toBe(false);
  });
});

describe('build — D_max is geometric in the permanent level L (reach)', () => {
  beforeEach(() => boot());

  it('each power level multiplies D_max by producerUpgradeRatio', () => {
    const b = getBuild();
    const d0 = b.dMax.value;
    b.raisePower();
    const d1 = b.dMax.value;
    b.raisePower();
    const d2 = b.dMax.value;
    expect(d1.div(d0).toNumber()).toBeCloseTo(BUILD_BALANCE.producerUpgradeRatio, 6);
    expect(d2.div(d1).toNumber()).toBeCloseTo(BUILD_BALANCE.producerUpgradeRatio, 6);
  });

  it('the shipped layer-0 ceiling matches the closed-form D_max', () => {
    const b = getBuild();
    const expected =
      BUILD_BALANCE.boardCells * BUILD_BALANCE.baseOutputCeiling * BUILD_BALANCE.adjacencyBoost;
    expect(b.dMax.value.toNumber()).toBeCloseTo(expected, 6);
  });
});

describe('build ↔ kernel integration — the crossing holds on live capacity', () => {
  beforeEach(() => boot());

  it('the kernel pegs against the live build D_max and crosses at N*', async () => {
    // Capacity now flows from the build module, not a stub. W₀ = D_max/H.
    expect(cycle().capacity.value.eq(getBuild().dMax.value)).toBe(true);

    const c = cycle();
    await tickUntil(() => c.runState.value === 'ended');
    expect(c.endedAtMinutes.value!).toBeCloseTo(c.predictedRunLength(), 1);
  });

  it('raising build power re-pegs to +0 run length (reach, not pacing)', async () => {
    const base = (await runToEnd()).endedAtMinutes.value!;

    // A permanent power level raises D_max ×ratio. Prestige is where the peg
    // re-baselines (W₀ = new D_max / H) — modeled here by startRun() after the
    // level-up. Under the re-peg the run length must not move.
    boot();
    getBuild().raisePower();
    cycle().startRun();
    const powered = (await runToEnd()).endedAtMinutes.value!;

    expect(getBuild().dMax.value.toNumber()).toBeGreaterThan(
      BUILD_BALANCE.boardCells * BUILD_BALANCE.baseOutputCeiling * BUILD_BALANCE.adjacencyBoost,
    );
    expect(Math.abs(powered - base)).toBeLessThan(0.05);
  });
});

async function runToEnd() {
  const c = cycle();
  await tickUntil(() => c.runState.value === 'ended');
  return c;
}
