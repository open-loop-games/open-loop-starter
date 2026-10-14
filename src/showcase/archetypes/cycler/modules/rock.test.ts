import { describe, expect, it } from 'vitest';
import {
  groundAt,
  quartersOf,
  SHORE_CELLS,
  sideWard,
  viewOf,
  wallWard,
  type Placed,
  type WardFactors,
} from './rock';

const F: WardFactors = { wardPerWall: 10, brace: 0.25, buttress: 0.2, mult: 1 };
const wall = (x: number, y: number): Placed => ({ kind: 'breakwater', x, y });
const butt = (x: number, y: number): Placed => ({ kind: 'buttress', x, y });

describe('the rock', () => {
  it('has the tower at its centre, a yard ring around it and a shore ring outside', () => {
    expect(groundAt(2, 2)).toBe('tower');
    expect(groundAt(1, 1)).toBe('yard');
    expect(groundAt(0, 3)).toBe('shore');
    expect(SHORE_CELLS).toHaveLength(16);
  });

  it('gives each corner two quarters and each other shore cell one', () => {
    expect(quartersOf(0, 0)).toEqual(['N', 'W']);
    expect(quartersOf(2, 0)).toEqual(['N']);
  });
});

describe('the ward', () => {
  it('is one unit for a lone wall, and none for anything else', () => {
    const view = viewOf([wall(2, 0), { kind: 'net', x: 1, y: 0 }]);
    expect(wallWard(view, 2, 0, F)).toBe(10);
    expect(wallWard(view, 1, 0, F)).toBe(0);
  });

  it('grows with each wall beside it along the shore', () => {
    const lone = wallWard(viewOf([wall(2, 0)]), 2, 0, F);
    const once = wallWard(viewOf([wall(2, 0), wall(1, 0)]), 2, 0, F);
    const twice = wallWard(viewOf([wall(2, 0), wall(1, 0), wall(3, 0)]), 2, 0, F);
    expect(once).toBeGreaterThan(lone);
    expect(twice).toBeGreaterThan(once);
  });

  it('counts a buttress diagonally behind a wall as well as one straight behind it', () => {
    const straight = wallWard(viewOf([wall(2, 0), butt(2, 1)]), 2, 0, F);
    const diagonal = wallWard(viewOf([wall(2, 0), butt(1, 1)]), 2, 0, F);
    expect(straight).toBeGreaterThan(10);
    expect(diagonal).toBe(straight);
  });

  it('sums a side over its five shore cells, corners included', () => {
    const view = viewOf([wall(0, 0), wall(2, 0), wall(0, 2)]);
    expect(sideWard(view, 'N', F)).toBe(wallWard(view, 0, 0, F) + wallWard(view, 2, 0, F));
    expect(sideWard(view, 'W', F)).toBe(wallWard(view, 0, 0, F) + wallWard(view, 0, 2, F));
    expect(sideWard(view, 'S', F)).toBe(0);
  });
});
