import { describe, it, expect } from 'vitest';
import { DEFAULT_AMBIENT_DATA } from '../data';

/**
 * Structural relationships that must hold across any retune of the default
 * Cozy Farm data: scene-variant ↔ unlock threshold parity and monotonic
 * threshold order.
 *
 * Runs in milliseconds, no sim. No magnitudes — a value with a tolerance band
 * belongs in a probe report a human reads, not in an assertion that reds on a
 * legitimate retune (`open-loop-engine/docs/consumer-guide-balance.md`
 * § Why this isn't a test suite). The headline-multiplier and idle-ceiling
 * readings that used to live here print from `balance/invariant-probe.ts`.
 */

const { unlocks, sceneVariants } = DEFAULT_AMBIENT_DATA;

const findUnlock = (id: string) => unlocks.find((u) => u.id === id)!;
const findScene = (id: string) => sceneVariants.find((s) => s.id === id)!;

describe('data invariants — scene-variant ↔ unlock threshold parity', () => {
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
