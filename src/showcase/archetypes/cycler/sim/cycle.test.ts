/**
 * Cycler cycle kernel — wave-model lock (IDENTITY § Balance model; studio/open-loop-starter#21
 * leaf 3). The kernel is now a wave-indexed STANDBY↔INBOUND phase controller: the
 * exogenous salvo `W_N = W₀·g^N` bleeds the defended line through the realized
 * clear-rate C, and the run ends when the line BREACHES (OVERRUN), not when an
 * arithmetic ceiling is crossed.
 *
 * Pins the shape invariants that survive retunes:
 *   • the run opens in STANDBY at authored pressure 1/H (salvo/cMax);
 *   • the salvo escalates monotonically and the run ends at the wall breach;
 *   • power re-pegs to +0 run length (realized C and cMax both scale with power, so
 *     the crossing holds); H authors run length.
 * No magnitudes: the realized run length is a measured value, so it prints from
 * `balance/cycle-probe.ts` rather than asserting here
 * (`open-loop-engine/docs/consumer-guide-balance.md` § Why this isn't a test suite).
 *
 * The tests place a competent reference board (`placeDefense`) so the run reaches the
 * pegged crossing + Δ_wall tail; an empty board breaches at wave 0 by design (no C).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, cycle, build, wall, placeDefense, tickUntil } from './harness';
import { DEFENSE_BALANCE } from '../data/defense';

const { headroom: H, salvoBase: g } = DEFENSE_BALANCE;
const waveCycleMinutes = (DEFENSE_BALANCE.standbySeconds + DEFENSE_BALANCE.inboundSeconds) / 60;

/** Drive a booted, board-placed engine to the line breach and hand back the run. */
async function runToBreach() {
  const c = cycle();
  await tickUntil(() => c.runState.value === 'ended', 20_000);
  return c;
}

describe('cycle kernel — shape invariant: opens in STANDBY at authored pressure 1/H', () => {
  beforeEach(() => boot());

  it('starts in STANDBY, wave 0, pressure exactly 1/H (salvo/cMax, placement-independent)', () => {
    const c = cycle();
    placeDefense();
    expect(c.phase.value).toBe('standby');
    expect(c.waveIndex.value).toBe(0);
    // W₀ = cMax/H ⇒ opening pressure salvo/cMax is exactly 1/H, independent of the board.
    expect(c.pressure.value).toBeCloseTo(1 / H, 5);
  });
});

describe('cycle kernel — shape invariant: the run ends at the line breach', () => {
  beforeEach(() => boot());

  it('escalates monotonically and terminates when the salvo breaches the line', async () => {
    const c = cycle();
    placeDefense();
    // Sample pressure a few waves in, then near the end — the salvo strictly climbs.
    await tickUntil(() => c.waveIndex.value >= 2, 20_000);
    const early = c.pressure.value;
    await tickUntil(() => c.waveIndex.value >= 4 || c.runState.value === 'ended', 20_000);
    const late = c.pressure.value;
    expect(late).toBeGreaterThan(early);

    await runToBreach();
    expect(c.runState.value).toBe('ended');
    expect(c.phase.value).toBe('overrun');
    expect(wall().breached.value).toBe(true); // the line breach IS the run-end
    expect(c.endedAtWave.value).not.toBeNull();
    // The breaching salvo overtook the realized clear-rate.
    expect(c.salvoAt(c.endedAtWave.value!).toNumber()).toBeGreaterThan(
      build().clearRate.value.toNumber(),
    );
  });
});

describe('cycle kernel — shape invariant: power re-pegs to +0 run length', () => {
  it('a raised power level (prestige-tier stand-in) leaves run length unchanged', async () => {
    boot();
    placeDefense();
    const c = cycle();
    const baseCMax = c.capacity.value;
    const base = (await runToBreach()).endedAtMinutes.value!;

    // Raise permanent power — realized C AND cMax both scale ·producerUpgradeRatio^L,
    // so the peg re-baselines W₀ = cMax/H and the crossing (log_g of their ratio) holds.
    const b = build();
    for (let i = 0; i < 4; i++) b.raisePower();
    c.startRun(); // re-peg + rescale the line; placements survive
    expect(c.capacity.value.gt(baseCMax)).toBe(true); // cMax genuinely rose with power
    const powered = (await runToBreach()).endedAtMinutes.value!;

    expect(Math.abs(powered - base)).toBeLessThan(waveCycleMinutes); // +0 (sub-one-wave)
  });
});

describe('cycle kernel — run length is authored by H', () => {
  it('a looser headroom lengthens the run', async () => {
    boot();
    placeDefense();
    const tight = (await runToBreach()).endedAtMinutes.value!;

    boot({ defense: { ...DEFENSE_BALANCE, headroom: H * 2 } });
    placeDefense();
    const loose = (await runToBreach()).endedAtMinutes.value!;

    expect(loose).toBeGreaterThan(tight);
    // Doubling H shifts the crossing by ~log_g(2) waves (quantized to integer waves).
    const deltaWaves = (loose - tight) / waveCycleMinutes;
    expect(deltaWaves).toBeGreaterThan(0.5);
    expect(deltaWaves).toBeLessThan(Math.log(2) / Math.log(g) + 2);
  });
});
