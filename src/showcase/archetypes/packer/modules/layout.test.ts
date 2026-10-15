import { describe, expect, it } from 'vitest';
import { CONDITIONS, PIECES, type ConditionId, type PieceId, type RelationId } from '../data';
import {
  compileLattice,
  emptyFit,
  evaluateLayout,
  latticeTotals,
  PIECE_INDEX,
  previewChange,
  underConditions,
  type Coord,
  type LayoutParams,
  type Occupant,
  type OccupancyView,
} from './layout';

const PARAMS: LayoutParams = {
  dps: { pulse: 1, rail: 8, lance: 32 },
  boost: { capacitor: 0.5, targeting: 0.5, director: 0.5 },
  beaconGain: 0.5,
  coolantGain: 0.4,
  tractorGain: 0.5,
  rayRange: 4,
  closeQuarters: false,
};

const OFFSETS: Record<Exclude<RelationId, 'ray'>, [number, number][]> = {
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
const STEP: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** Board side: every cell of the square is open, and a ray stops at its edge. */
const SIDE = 9;

type Cells = Record<string, PieceId | [PieceId, number]>;

/** A square board from a map of "x,y" → type (or [type, facing]), read the way the board module reads its grid. */
function boardOf(cells: Cells): OccupancyView {
  const at = new Map<string, Occupant & Coord>();
  for (const [k, v] of Object.entries(cells)) {
    const [x, y] = k.split(',').map(Number) as [number, number];
    const [type, facing] = Array.isArray(v) ? v : [v, 0];
    at.set(k, { id: `${type}@${k}`, type, facing, x, y });
  }
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < SIDE && y < SIDE;
  return {
    occupantAt: (x, y) => at.get(`${x},${y}`) ?? null,
    *reach(x, y, relation, facing = 0) {
      if (relation === 'ray') {
        const [dx, dy] = STEP[facing]!;
        for (let cx = x + dx, cy = y + dy; inside(cx, cy); cx += dx, cy += dy)
          yield { x: cx, y: cy };
        return;
      }
      for (const [dx, dy] of OFFSETS[relation]) yield { x: x + dx, y: y + dy };
    },
    *occupied() {
      yield* at.values();
    },
    isOpen: inside,
  };
}

const at = (view: OccupancyView, p: LayoutParams, key: string) =>
  [...evaluateLayout(view, p).pieces.values()].find((r) => `${r.x},${r.y}` === key)!;
const firepowerAt = (view: OccupancyView, key: string, p = PARAMS) => at(view, p, key).firepower;

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

describe('the Fire Director', () => {
  it('boosts the weapons down the line it faces, and none behind it', () => {
    // Facing starboard from 1,4: the cannon at 3,4 is on its line, the one at 0,4 is behind it.
    const view = boardOf({ '1,4': ['director', 1], '3,4': 'pulse', '0,4': 'pulse' });
    expect(firepowerAt(view, '3,4')).toBeGreaterThan(PARAMS.dps.pulse);
    expect(firepowerAt(view, '0,4')).toBe(PARAMS.dps.pulse);
  });

  it('turns: the same cell boosts another line at another facing', () => {
    const port = boardOf({ '1,4': ['director', 3], '3,4': 'pulse', '0,4': 'pulse' });
    expect(firepowerAt(port, '0,4')).toBeGreaterThan(PARAMS.dps.pulse);
    expect(firepowerAt(port, '3,4')).toBe(PARAMS.dps.pulse);
  });

  it('reaches as many cells as its range, and no further', () => {
    const view = boardOf({ '0,0': ['director', 1], '2,0': 'pulse', '6,0': 'pulse' });
    expect(firepowerAt(view, '2,0')).toBeGreaterThan(PARAMS.dps.pulse);
    expect(firepowerAt(view, '6,0')).toBe(PARAMS.dps.pulse);
  });
});

describe('the Salvage Tractor', () => {
  it('raises an adjacent weapon’s salvage and leaves its firepower', () => {
    const plain = at(boardOf({ '0,0': 'pulse' }), PARAMS, '0,0');
    const towed = at(boardOf({ '0,0': 'pulse', '1,0': 'tractor' }), PARAMS, '0,0');
    expect(towed.firepower).toBe(plain.firepower);
    expect(towed.salvage).toBeGreaterThan(plain.salvage);
  });
});

describe('a sector’s conditions', () => {
  const under = (c: ConditionId) => underConditions(PARAMS, [c]);

  it('darkens corner links in an ion storm', () => {
    const view = boardOf({ '0,0': 'pulse', '1,1': 'targeting' });
    expect(firepowerAt(view, '0,0', under('ion-storm'))).toBe(PARAMS.dps.pulse);
  });

  it('weakens beacon stamps under jamming', () => {
    const view = boardOf({ '0,0': 'pulse', '1,2': 'beacon' });
    expect(firepowerAt(view, '0,0', under('jamming'))).toBeLessThan(firepowerAt(view, '0,0'));
    expect(firepowerAt(view, '0,0', under('jamming'))).toBeGreaterThan(PARAMS.dps.pulse);
  });

  it('stops a manifold amplifying in a coolant leak', () => {
    const plain = boardOf({ '0,0': 'pulse', '1,0': 'capacitor' });
    const cooled = boardOf({ '0,0': 'pulse', '1,0': 'capacitor', '2,0': 'coolant' });
    expect(firepowerAt(cooled, '0,0', under('coolant-leak'))).toBe(firepowerAt(plain, '0,0'));
  });

  it('shortens a director’s line under shear', () => {
    const view = boardOf({ '0,0': ['director', 1], '4,0': 'pulse' });
    expect(firepowerAt(view, '4,0')).toBeGreaterThan(PARAMS.dps.pulse);
    expect(firepowerAt(view, '4,0', under('shear'))).toBe(PARAMS.dps.pulse);
  });

  it('runs a booster cold in close quarters when no empty cell is beside it', () => {
    const walled = boardOf({
      '4,4': 'capacitor',
      '3,4': 'pulse',
      '5,4': 'pulse',
      '4,3': 'pulse',
      '4,5': 'pulse',
    });
    const open = boardOf({ '4,4': 'capacitor', '3,4': 'pulse' });
    expect(firepowerAt(walled, '3,4', under('close-quarters'))).toBe(PARAMS.dps.pulse);
    expect(firepowerAt(open, '3,4', under('close-quarters'))).toBeGreaterThan(PARAMS.dps.pulse);
  });
});

describe('the lattice', () => {
  /** mulberry32, so a failing board can be replayed */
  const rng = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  it('scores every board as the evaluator totals it, under any conditions', () => {
    const random = rng(7);
    const cells: Coord[] = [];
    for (let y = 0; y < SIDE; y++) for (let x = 0; x < SIDE; x++) cells.push({ x, y });
    const lattice = compileLattice(boardOf({}), cells);
    for (let trial = 0; trial < 40; trial++) {
      const fit = emptyFit(lattice);
      const layout: Cells = {};
      cells.forEach((c, i) => {
        if (random() < 0.3) return;
        const def = PIECES[Math.floor(random() * PIECES.length)]!;
        const facing = def.turns ? Math.floor(random() * 4) : 0;
        layout[`${c.x},${c.y}`] = [def.id, facing];
        fit.piece[i] = PIECE_INDEX[def.id];
        fit.facing[i] = facing;
      });
      const conditions = CONDITIONS.filter(() => random() < 0.3).map((c) => c.id);
      const p = underConditions(PARAMS, conditions);
      const want = evaluateLayout(boardOf(layout), p);
      const got = latticeTotals(lattice, fit, p);
      expect(got.firepower).toBeCloseTo(want.total, 9);
      expect(got.salvage).toBeCloseTo(want.salvageTotal, 9);
    }
  });
});
