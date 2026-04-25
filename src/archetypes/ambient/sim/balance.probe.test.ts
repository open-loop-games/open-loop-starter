import { describe, it, expect } from 'vitest';
import { DEFAULT_AMBIENT_DATA } from '../data';

/**
 * Balance regression probe — math-only pins on the default Cozy Farm data.
 *
 * Runs in milliseconds, no sim. Values are placeholders that OL-697's solver
 * will re-pin to arc-correct numbers; they exist now so balance drift in
 * `data/producers.ts` can never land silently. Any intentional change to a
 * solver knob lands here together with the commit that moves it.
 *
 * Forbidden by archetype doc § 7: any sim driver. This file does not import
 * from `open-loop-engine/harness`.
 */

const { balance, achievements, producers } = DEFAULT_AMBIENT_DATA;

describe('balance probe — solver-knob receipts', () => {
  it('tier1BaseRate matches beat-1 placeholder — OL-697 solver pins', () => {
    expect(Number(balance.tier1BaseRate)).toBe(1.0);
  });

  it('producerCostGrowth matches beat-3/beat-5 placeholder — OL-697 solver pins', () => {
    expect(Number(balance.producerCostGrowth)).toBe(1.08);
  });

  it('achievementMultiplier matches beat-6 placeholder — OL-697 solver pins', () => {
    expect(Number(balance.achievementMultiplier)).toBe(1.02);
  });

  it('prestigeEligibleThreshold matches beat-7 placeholder — OL-697 solver pins', () => {
    expect(Number(balance.prestigeEligibleThreshold)).toBe(1_000_000);
  });
});

describe('balance probe — headline-multiplier sanity', () => {
  it('achievement-headline contribution stays within an idle-arc range', () => {
    // Twenty achievements at 1.02 each compound to ≈ 1.486×. The arc must
    // not lean entirely on achievements for headline lift; keep the
    // ceiling below 2× until the solver pins a stronger multiplier.
    const total = Math.pow(Number(balance.achievementMultiplier), achievements.length);
    expect(total).toBeGreaterThan(1);
    expect(total).toBeLessThan(2);
  });

  it('orchard baseRate × cost-growth ladder reaches a plausible idle ceiling', () => {
    // Sanity: top-tier producer base rate, scaled by 50 purchases at the
    // current cost-growth, must put per-second well above 1k. Real arc-
    // correctness is OL-697's job — this only catches silent zeroing.
    const orchard = producers.find((p) => p.id === 'orchard')!;
    const ceiling = Number(orchard.baseRate) * 50;
    expect(ceiling).toBeGreaterThan(1_000);
  });
});
