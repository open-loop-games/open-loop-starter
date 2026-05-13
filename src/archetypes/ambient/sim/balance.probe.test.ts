import { describe, it, expect } from 'vitest';
import { DEFAULT_AMBIENT_DATA } from '../data';
import { DEFAULT_ACHIEVEMENT_MULTIPLIER } from '../modules';

/**
 * Structural-invariant locks on the default Cozy Farm data.
 *
 * Runs in milliseconds, no sim. Pins relationships that hold regardless of
 * solver-output rounding: scene-variant ↔ unlock threshold parity, monotonic
 * threshold order, and headline-multiplier sanity ranges. Beat-fire-time
 * locks belong on `runMatrixUntil` with `toBeBetween` bounds, not here —
 * see `archetypes/BALANCING.md` § Theme 5.
 */

const { achievements, producers, unlocks, sceneVariants } = DEFAULT_AMBIENT_DATA;

const findUnlock = (id: string) => unlocks.find((u) => u.id === id)!;
const findScene = (id: string) => sceneVariants.find((s) => s.id === id)!;
const findProducer = (id: string) => producers.find((p) => p.id === id)!;

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
    const total = Math.pow(DEFAULT_ACHIEVEMENT_MULTIPLIER, achievements.length);
    expect(total).toBeGreaterThan(1);
    expect(total).toBeLessThan(2);
  });

  it('orchard baseRate × cost-growth ladder reaches a plausible idle ceiling', () => {
    const orchard = findProducer('orchard');
    const ceiling = Number(orchard.baseRate) * 50;
    expect(ceiling).toBeGreaterThan(1_000);
  });
});
