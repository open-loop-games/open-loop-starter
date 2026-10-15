import { describe, expect, it } from 'vitest';
import type { PieceId, RelationId } from '../data';
import {
  evaluateLayout,
  previewChange,
  type LayoutParams,
  type Occupant,
  type OccupancyView,
} from './layout';

const PARAMS: LayoutParams = {
  dps: { pulse: 1, rail: 8 },
  boost: { capacitor: 0.5, targeting: 0.5 },
  beaconGain: 0.5,
  coolantGain: 0.4,
};

const OFFSETS: Record<RelationId, [number, number][]> = {
  none: [],
  orthogonal: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
  corners: [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ],
  knight: [
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
    [-1, -2],
    [-2, -1],
    [-2, 1],
    [-1, 2],
  ],
};

/** An unbounded board from a map of "x,y" → type, read the way the board module reads its grid. */
function boardOf(cells: Record<string, PieceId>): OccupancyView {
  const at = new Map<string, Occupant & { x: number; y: number }>();
  for (const [k, type] of Object.entries(cells)) {
    const [x, y] = k.split(',').map(Number) as [number, number];
    at.set(k, { id: `${type}@${k}`, type, x, y });
  }
  return {
    occupantAt: (x, y) => at.get(`${x},${y}`) ?? null,
    *reach(x, y, relation) {
      for (const [dx, dy] of OFFSETS[relation]) yield { x: x + dx, y: y + dy };
    },
    *occupied() {
      yield* at.values();
    },
  };
}

const firepowerAt = (view: OccupancyView, key: string) =>
  [...evaluateLayout(view, PARAMS).pieces.values()].find((p) => `${p.x},${p.y}` === key)!.firepower;

describe('the arrangement evaluator', () => {
  it('fires a bare weapon at its dps, and a booster alone fires nothing', () => {
    const r = evaluateLayout(boardOf({ '0,0': 'pulse', '5,5': 'capacitor' }), PARAMS);
    expect(r.total).toBe(PARAMS.dps.pulse);
  });

  it('reaches a weapon only through the booster’s own relation', () => {
    const edge = firepowerAt(boardOf({ '0,0': 'pulse', '1,0': 'capacitor' }), '0,0');
    const corner = firepowerAt(boardOf({ '0,0': 'pulse', '1,1': 'capacitor' }), '0,0');
    expect(edge).toBeGreaterThan(PARAMS.dps.pulse);
    expect(corner).toBe(PARAMS.dps.pulse);
    const array = firepowerAt(boardOf({ '0,0': 'pulse', '1,1': 'targeting' }), '0,0');
    expect(array).toBeGreaterThan(PARAMS.dps.pulse);
  });

  it('sums links inside their family and stamps inside theirs, then multiplies the two', () => {
    const fp = firepowerAt(
      boardOf({
        '0,0': 'pulse',
        '1,0': 'capacitor',
        '0,1': 'capacitor',
        '1,2': 'beacon',
        '2,1': 'beacon',
      }),
      '0,0',
    );
    const links = 2 * PARAMS.boost.capacitor;
    const stamps = 2 * PARAMS.beaconGain;
    expect(fp).toBeCloseTo(PARAMS.dps.pulse * (1 + links) * (1 + stamps));
  });

  it('amplifies a booster’s links through an adjacent manifold, and buffs no weapon directly', () => {
    const plain = firepowerAt(boardOf({ '0,0': 'pulse', '1,0': 'capacitor' }), '0,0');
    const cooled = firepowerAt(
      boardOf({ '0,0': 'pulse', '1,0': 'capacitor', '2,0': 'coolant' }),
      '0,0',
    );
    expect(cooled).toBeGreaterThan(plain);
    const beside = firepowerAt(boardOf({ '0,0': 'pulse', '1,0': 'coolant' }), '0,0');
    expect(beside).toBe(PARAMS.dps.pulse);
  });

  it('credits each module with the firepower lost if it were lifted', () => {
    const view = boardOf({ '0,0': 'pulse', '1,0': 'capacitor' });
    const r = evaluateLayout(view, PARAMS);
    const cap = [...r.pieces.values()].find((p) => p.type === 'capacitor')!;
    expect(cap.marginal).toBeCloseTo(r.total - PARAMS.dps.pulse);
  });

  it('previews a fit as exactly the change the fit makes, cell by cell', () => {
    const before = boardOf({ '0,0': 'pulse', '2,0': 'pulse' });
    const after = boardOf({ '0,0': 'pulse', '2,0': 'pulse', '1,0': 'capacitor' });
    const p = previewChange(before, PARAMS, [
      { at: { x: 1, y: 0 }, occupant: { id: 'ghost', type: 'capacitor' } },
    ]);
    expect(p.delta).toBeCloseTo(
      evaluateLayout(after, PARAMS).total - evaluateLayout(before, PARAMS).total,
    );
    expect([...p.cells.keys()].sort()).toEqual(['0,0', '2,0']);
  });
});
