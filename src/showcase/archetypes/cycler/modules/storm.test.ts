import { describe, expect, it } from 'vitest';
import { viewOf, type Placed, type WardFactors } from './rock';
import { breakerLeak, neighbours, nextBackingOdds, screenWard, yardQuartersOf } from './storm';
import { SEA } from '../data';

const F: WardFactors = { wardPerWall: 10, brace: 0.25, buttress: 0.2, mult: 1 };
const screen = (x: number, y: number): Placed => ({ kind: 'screen', x, y });

describe('screens', () => {
  it('face the side they stand behind, and a corner of the yard faces two', () => {
    expect(yardQuartersOf(2, 1)).toEqual(['N']);
    expect(yardQuartersOf(1, 1)).toEqual(['N', 'W']);
    expect(yardQuartersOf(0, 0)).toEqual([]);
  });

  it('turn spray only on the quarters they face', () => {
    const view = viewOf([screen(2, 1), screen(1, 1)]);
    expect(screenWard(view, 'N', F, 1.2)).toBe(2 * 12);
    expect(screenWard(view, 'W', F, 1.2)).toBe(12);
    expect(screenWard(view, 'S', F, 1.2)).toBe(0);
  });
});

describe('a breaker', () => {
  it('sends its spray over the walls, so walls alone leak the spray share', () => {
    const leak = breakerLeak({ force: 10, spray: 0.3, walls: 100, screens: 0 });
    expect(leak).toBeCloseTo(3, 9);
  });

  it('is turned whole by enough walls and screens', () => {
    expect(breakerLeak({ force: 10, spray: 0.3, walls: 7, screens: 3 })).toBe(0);
  });
});

describe('backing', () => {
  it('backs to a neighbouring quarter', () => {
    expect(neighbours('N')).toEqual(['E', 'W']);
  });

  it('grows less likely after a backed breaker and recovers after a true one', () => {
    const after = nextBackingOdds(SEA.backingOdds, true);
    expect(after).toBeLessThan(SEA.backingOdds);
    expect(nextBackingOdds(after, false)).toBeGreaterThan(after);
    expect(nextBackingOdds(SEA.backingOdds, false)).toBe(SEA.backingOdds);
  });
});
