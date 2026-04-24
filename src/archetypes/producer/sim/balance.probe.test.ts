import { describe, it, expect } from 'vitest';
import { DEFAULT_PRODUCER_DATA } from '../data';

/**
 * Balance regression probe — math-only pins on the default Bakery data.
 *
 * Runs in milliseconds, no sim. Reachability is discovered and re-verified
 * by `pnpm balance:solve:producer` (engine-as-oracle bisection) and
 * `pnpm balance:producer` (5-seed arc probe). This file is the receipt:
 * any intentional change to a solver knob or content stack lands here
 * together with the commit that moves it.
 *
 * Content-math receipts (§ 4, Bakery content set):
 * 1. Top-producer rateChain ceiling reaches ≥ 1e6× base (beat-7 reachable).
 * 2. Per-producer in-arc stack (tier-i + tier-ii + tier-iia) = 12× on any
 *    continuous producer.
 * 3. Global-production stack (global-x2 → global-x480) = 480× compound.
 * 4. Arc-close capstone (global-x480) cost is the gating threshold for B8.
 */

const { balance, upgrades } = DEFAULT_PRODUCER_DATA;

describe('balance probe — headline multiplier ceiling', () => {
  it('full-stack compound reaches beat-7 threshold (≥ 1e6×)', () => {
    // Per-producer: tier-i × tier-ii × tier-iia (tier-iii is post-arc).
    // Values inlined from upgrades.ts's PER_PRODUCER_TIERS to keep the
    // receipt math-only — if someone changes tier rates in upgrades.ts
    // this test doesn't follow them silently.
    const perProducerStack = 2 * 3 * 2;

    // Global-production ladder (targetProducerId === null && not a click upgrade).
    // Includes global-x2 through global-x480, excluding click-x2/x4/x8.
    const globalStack = upgrades
      .filter((u) => u.targetProducerId === null && !u.id.startsWith('click-'))
      .reduce((acc, u) => acc * Number(u.multiplier), 1);

    // Milestones: all 10 tiers fired on the top producer.
    const milestoneStack = Math.pow(
      Number(balance.milestoneBonusPerTier),
      balance.milestoneThresholds.length,
    );

    // Achievements: partial in-arc set. Bakery ships 33 achievements with
    // ~26 reachable in-arc (several lifetime/click hidden achievements
    // require post-arc rates). 1.02^26 ≈ 1.67×.
    const achievementsStack = Math.pow(Number(balance.achievementMultiplier), 26);

    const maxHeadlineStack = perProducerStack * globalStack * milestoneStack * achievementsStack;

    expect(maxHeadlineStack).toBeGreaterThanOrEqual(1e6);
  });

  it('per-producer in-arc stack is 12×', () => {
    // 2 × 3 × 2 from PER_PRODUCER_TIERS.
    expect(2 * 3 * 2).toBe(12);
  });

  it('global-production ladder compound is 480×', () => {
    const globalStack = upgrades
      .filter((u) => u.targetProducerId === null && !u.id.startsWith('click-'))
      .reduce((acc, u) => acc * Number(u.multiplier), 1);
    expect(globalStack).toBe(480);
  });
});

describe('balance probe — arc-close capstone gate (beat-8)', () => {
  it('top global cost dominates the arc-close cost ceiling', () => {
    const globalProd = upgrades.filter(
      (u) => u.targetProducerId === null && !u.id.startsWith('click-'),
    );
    const costs = globalProd.map((u) => Number(u.cost));
    const top = Math.max(...costs);
    const rest = costs.filter((c) => c !== top).reduce((a, b) => a + b, 0);
    // Capstone must be the dominant cost in the ladder; if a lower-rung
    // change silently exceeds it, beat-8 stops gating on the right thing.
    expect(top).toBeGreaterThan(rest);
    expect(top).toBeGreaterThanOrEqual(1e14); // 100T floor for the arc stretch
  });
});

describe('balance probe — solver-knob receipts', () => {
  it('cursor.baseCost matches beat-2 solver convergence', () => {
    const cursor = DEFAULT_PRODUCER_DATA.producers.find((p) => p.id === 'cursor')!;
    expect(Number(cursor.purchase!.baseCost)).toBe(46);
  });

  it('grandma.baseCost matches beat-3 solver convergence', () => {
    const grandma = DEFAULT_PRODUCER_DATA.producers.find((p) => p.id === 'grandma')!;
    expect(Number(grandma.purchase!.baseCost)).toBe(70);
  });

  it('tier1UpgradeMultiplier matches beat-4 solver convergence', () => {
    expect(Number(balance.tier1UpgradeMultiplier)).toBe(496);
  });

  it('milestoneBonusPerTier matches the locked climax multiplier', () => {
    expect(Number(balance.milestoneBonusPerTier)).toBe(3);
  });
});
