import { describe, it, expect } from 'vitest';
import { DEFAULT_AMBIENT_DATA } from '../data';

/**
 * Balance regression probe — math-only pins on the default Cozy Farm data.
 *
 * Runs in milliseconds, no sim. Reachability is discovered and re-verified
 * by `pnpm balance:solve:ambient` (engine-as-oracle bisection over the four
 * solver beats: B2, B3, B5, B7) and surface-checked by `pnpm
 * balance:probes:ambient` (offline-round-trip + no-pressure invariants).
 * This file is the receipt: any intentional change to a solver knob or to
 * the scene-variant ladder lands here together with the commit that moves
 * it.
 *
 * Forbidden by archetype doc § 7: any sim driver. This file does not import
 * from `open-loop-engine/harness`.
 */

const { balance, achievements, producers, unlocks, sceneVariants } = DEFAULT_AMBIENT_DATA;

const findUnlock = (id: string) => unlocks.find((u) => u.id === id)!;
const findScene = (id: string) => sceneVariants.find((s) => s.id === id)!;
const findProducer = (id: string) => producers.find((p) => p.id === id)!;

describe('balance probe — solver-knob receipts', () => {
  it('planter.baseCost matches beat-2 solver convergence', () => {
    expect(Number(findProducer('planter').purchase!.baseCost)).toBe(55);
  });

  it('coop-built.threshold matches beat-3 solver convergence', () => {
    expect(Number(findUnlock('coop-built').threshold)).toBe(30_810_558);
  });

  it('spring-arrives.threshold matches beat-5 solver convergence', () => {
    expect(Number(findUnlock('spring-arrives').threshold)).toBe(1_045_994_938);
  });

  it('year-cycles.threshold matches beat-7 solver convergence', () => {
    expect(Number(findUnlock('year-cycles').threshold)).toBe(4_279_322_281);
  });

  it('tier1BaseRate held at 1.0 — beat-1 fires off planter initialAmount', () => {
    expect(Number(balance.tier1BaseRate)).toBe(1.0);
  });

  it('achievementMultiplier held at 1.02 — beat-6 multiplier ladder', () => {
    expect(Number(balance.achievementMultiplier)).toBe(1.02);
  });

  it('prestigeEligibleThreshold held at 1e6 — dominated by year-cycles gate', () => {
    expect(Number(balance.prestigeEligibleThreshold)).toBe(1_000_000);
  });
});

describe('balance probe — scene-variant ↔ unlock threshold parity', () => {
  // The inline comment in scene-variants.ts mandates parity; receipts here
  // catch silent drift. Geometric interpolation between spring (1.05e9) and
  // year-cycles (4.28e9) sets the four mid-arc transitions.
  it.each([
    ['spring', 'spring-arrives'],
    ['summer', 'summer-warmth'],
    ['autumn', 'harvest-light'],
    ['winter', 'winter-quiet'],
    ['year-cycles', 'year-cycles'],
  ])('scene-variant %s threshold matches unlock %s threshold', (sceneId, unlockId) => {
    expect(Number(findScene(sceneId).threshold)).toBe(Number(findUnlock(unlockId).threshold));
  });

  it('mid-arc scene-variants stay in monotonic order', () => {
    const order = ['spring', 'summer', 'autumn', 'winter', 'year-cycles'];
    const thresholds = order.map((id) => Number(findScene(id).threshold));
    const sorted = [...thresholds].sort((a, b) => a - b);
    expect(thresholds).toEqual(sorted);
  });
});

describe('balance probe — headline-multiplier sanity', () => {
  it('achievement-headline contribution stays within an idle-arc range', () => {
    const total = Math.pow(Number(balance.achievementMultiplier), achievements.length);
    expect(total).toBeGreaterThan(1);
    expect(total).toBeLessThan(2);
  });

  it('orchard baseRate × cost-growth ladder reaches a plausible idle ceiling', () => {
    const orchard = findProducer('orchard');
    const ceiling = Number(orchard.baseRate) * 50;
    expect(ceiling).toBeGreaterThan(1_000);
  });
});
