/**
 * Cycler cycle kernel — Lane-4 lock (IDENTITY § Balance model, lane 4).
 *
 * Pins what `balance/cycle-probe.ts` MEASURED against the real engine: the
 * pegged run-length band and the two shape invariants (the run ends at the burn
 * crossing; power re-pegs to +0 run length). Measure-and-record, never
 * set-as-target — if H/g/T_g/τ_setup are retuned, re-run the probe and update the
 * provenance below.
 *
 * Provenance (2026-07, cycle-probe.ts at shipped constants
 * H=4, g=2, T_g=6, τ_setup=4): N* = τ_setup + T_g·log_g(H) = 16.00m, <0.1% drift
 * vs the closed form (the ≤1 dt overshoot at 1s tick). Authored target band
 * [12,20]m (CADENCE_BALANCE).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal } from '@open-loop/engine';
import { boot, cycle, tickUntil } from './harness';
import { BUILD_BALANCE } from '../data/build';
import { THREAT_BALANCE } from '../data/threat';

const CADENCE_BAND: [number, number] = [12, 20];
const baseCapacity =
  BUILD_BALANCE.boardCells * BUILD_BALANCE.baseOutputCeiling * BUILD_BALANCE.adjacencyBoost;

/** Drive a booted engine to the Merge bell and hand back the measured run. */
async function runToEnd() {
  const c = cycle();
  await tickUntil(() => c.runState.value === 'ended');
  return c;
}

describe('cycle kernel — pegged run-length band', () => {
  beforeEach(() => boot());

  it('realizes the closed-form N* = τ_setup + T_g·log_g(H) at the shipped constants', async () => {
    const c = await runToEnd();
    const measured = c.endedAtMinutes.value!;
    // Shipping burn == the projection's closed form (retune-robust: predicted
    // recomputes from the same constants). `toBeCloseTo(_, 1)` ⇒ within 0.05m.
    expect(measured).toBeCloseTo(c.predictedRunLength(), 1);
  });

  it('lands inside the authored target band [12,20]m (design intent)', async () => {
    const c = await runToEnd();
    const measured = c.endedAtMinutes.value!;
    expect(measured).toBeGreaterThanOrEqual(CADENCE_BAND[0]);
    expect(measured).toBeLessThanOrEqual(CADENCE_BAND[1]);
  });
});

describe('cycle kernel — shape invariant: the run ends at the burn crossing', () => {
  beforeEach(() => boot());

  it('opens in the setup grace at pressure 1/H, well under the ceiling', () => {
    const c = cycle();
    expect(c.phase.value).toBe('setup');
    // W₀ = D_max/H ⇒ opening pressure is exactly 1/H.
    expect(c.pressure.value).toBeCloseTo(1 / THREAT_BALANCE.headroom, 5);
  });

  it('escalates monotonically and terminates when burn overtakes D_max', async () => {
    const c = cycle();
    // Sample pressure at the end of the setup grace, then partway up the ramp.
    await tickUntil(() => c.elapsedMinutes.value >= THREAT_BALANCE.setupGrace + 2);
    const early = c.pressure.value;
    await tickUntil(() => c.elapsedMinutes.value >= c.predictedRunLength() - 2);
    const late = c.pressure.value;
    expect(late).toBeGreaterThan(early); // exogenous burn strictly climbs

    await runToEnd();
    expect(c.runState.value).toBe('ended');
    expect(c.phase.value).toBe('merge-bell');
    expect(c.pressure.value).toBeGreaterThanOrEqual(1); // ended AT the crossing
    expect(c.endedAtMinutes.value).not.toBeNull();
  });
});

describe('cycle kernel — shape invariant: power re-pegs to +0 run length', () => {
  it('a raised capacity (prestige-tier stand-in) leaves run length unchanged', async () => {
    // Baseline run at the shipped capacity.
    boot();
    const base = (await runToEnd()).endedAtMinutes.value!;

    // Force a raised D_max — the harness analog of unlocking a prestige tier.
    // Under the peg, W₀ re-baselines to D_max/H, so N* must not move.
    const raised = new Decimal(baseCapacity).mul(
      Decimal.pow(BUILD_BALANCE.producerUpgradeRatio, 4),
    );
    boot({ capacity: () => raised });
    const c = cycle();
    expect(c.capacity.value.gt(baseCapacity)).toBe(true); // capacity really rose
    const powered = (await runToEnd()).endedAtMinutes.value!;

    expect(Math.abs(powered - base)).toBeLessThan(0.05); // +0 run length
  });
});

describe('cycle kernel — run length is authored by H', () => {
  it('a looser headroom lengthens the run to the closed form for that H', async () => {
    boot({ threat: { ...THREAT_BALANCE, headroom: THREAT_BALANCE.headroom * 2 } });
    const c = await runToEnd();
    const measured = c.endedAtMinutes.value!;
    expect(measured).toBeCloseTo(c.predictedRunLength(), 1);
    // Doubling H adds exactly T_g·log_g(2) = one escalation timescale.
    expect(measured).toBeGreaterThan(
      THREAT_BALANCE.setupGrace + THREAT_BALANCE.escalationTimescale,
    );
  });
});
