/**
 * Adjacency evaluator — pure unit spec (no engine). The lifted mv-hr shape,
 * stripped to cycler's Reactor/Relay: booster-centric additive stacking over an
 * OccupancyView, and preview-as-overlay. Fast, state-free — the evaluator is pure.
 */

import { describe, expect, it } from 'vitest';
import { coveredCells, evaluateBoard, previewAt, type OccupancyView } from '../modules';
import { BOARD, PIECES, REFERENCE_LAYOUT, type PieceKind } from '../data/pieces';

/** An OccupancyView backed by a row-major layout array. */
function viewOf(
  layout: readonly (PieceKind | null)[],
  width: number = BOARD.width,
  height: number = BOARD.height,
): OccupancyView {
  return {
    width,
    height,
    pieceAt: (x, y) =>
      x < 0 || y < 0 || x >= width || y >= height ? null : (layout[y * width + x] ?? null),
  };
}

describe('coveredCells — connection shapes, clipped to bounds', () => {
  it('cross covers the 4-connected neighbours, dropping out-of-bounds', () => {
    expect(coveredCells('cross', 0, 0, 4, 4)).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
    expect(coveredCells('cross', 1, 1, 4, 4)).toHaveLength(4);
  });

  it('ring is the 8-connected Moore neighbourhood', () => {
    expect(coveredCells('ring', 1, 1, 4, 4)).toHaveLength(8);
  });

  it('reach is the range-2 cardinal cross — distance 1 AND 2 along each axis', () => {
    // Centre of a 5×5: all 8 cardinal cells (range 1 + range 2) are in bounds.
    expect(coveredCells('reach', 2, 2, 5, 5)).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 1 },
      { x: 2, y: 3 },
      { x: 0, y: 2 },
      { x: 4, y: 2 },
      { x: 2, y: 0 },
      { x: 2, y: 4 },
    ]);
  });

  it('reach clips out-of-bounds cells at a corner, keeping the in-bounds range-2 cells', () => {
    // (0,0) on 5×5: only +x/+y in bounds — range-1 (1,0),(0,1) AND range-2 (2,0),(0,2).
    expect(coveredCells('reach', 0, 0, 5, 5)).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
    ]);
  });

  it('reach covers a range-2 cell that cross does not (the wider footprint)', () => {
    const hasCell = (cells: Array<{ x: number; y: number }>, x: number, y: number) =>
      cells.some((c) => c.x === x && c.y === y);
    expect(hasCell(coveredCells('reach', 2, 0, 5, 1), 0, 0)).toBe(true); // range-2 west
    expect(hasCell(coveredCells('cross', 2, 0, 5, 1), 0, 0)).toBe(false); // cross stops at range 1
  });
});

describe('evaluateBoard — Pylon: a range-2 booster lifting both receivers (the bridge)', () => {
  // A 5-wide row: Reactor and Lance each sit two cells from a central Pylon.
  const row5 = (...cells: (PieceKind | null)[]) => viewOf(cells, 5, 1);

  it('a Pylon lifts a range-2 Reactor AND a range-2 Lance that a cross-Relay could not', () => {
    // reactor(0,0) · pylon(2,0) · lance(4,0): both receivers sit at distance 2.
    const ev = evaluateBoard(row5('reactor', null, 'pylon', null, 'lance'));
    const lifted = 1 + PIECES.pylon.boost!;
    expect(ev.producers.get('0,0')!.multiplier).toBeCloseTo(lifted, 6);
    expect(ev.towers.get('4,0')!.multiplier).toBeCloseTo(lifted, 6);
    expect(ev.total).toBeCloseTo(PIECES.reactor.output! * lifted, 6);
    expect(ev.clearRate).toBeCloseTo(PIECES.lance.intercept! * lifted, 6);
  });

  it('a Relay (range-1 cross) in the same slot reaches neither distance-2 receiver', () => {
    const ev = evaluateBoard(row5('reactor', null, 'relay', null, 'lance'));
    expect(ev.producers.get('0,0')!.multiplier).toBe(1); // out of cross range
    expect(ev.towers.get('4,0')!.multiplier).toBe(1);
  });

  it('a Pylon produces nothing on its own (a booster, like Relay)', () => {
    const ev = evaluateBoard(row5('pylon', null, null, null, null));
    expect(ev.total).toBe(0);
    expect(ev.producers.size).toBe(0);
  });
});

describe('evaluateBoard — booster-centric additive synergy', () => {
  it('a lone Reactor yields its base output at multiplier 1', () => {
    const ev = evaluateBoard(viewOf(['reactor', null, null, null], 2, 2));
    expect(ev.total).toBe(PIECES.reactor.output);
    expect(ev.producers.get('0,0')!.multiplier).toBe(1);
  });

  it('a Relay adds +boost to each cross-covered Reactor; two Relays stack additively', () => {
    // R at (0,0); Relays at (1,0) and (0,1) both cross-cover it → 1 + 2·boost.
    const ev = evaluateBoard(viewOf(['reactor', 'relay', 'relay', null], 2, 2));
    expect(ev.producers.get('0,0')!.multiplier).toBeCloseTo(1 + 2 * PIECES.relay.boost!, 6);
    expect(ev.total).toBeCloseTo(PIECES.reactor.output! * (1 + 2 * PIECES.relay.boost!), 6);
  });

  it('a Relay produces nothing on its own', () => {
    const ev = evaluateBoard(viewOf(['relay', null, null, null], 2, 2));
    expect(ev.total).toBe(0);
    expect(ev.producers.size).toBe(0);
  });

  it('the reference full board realizes the calibrated ceiling (12 producers)', () => {
    const ev = evaluateBoard(viewOf(REFERENCE_LAYOUT));
    expect(ev.producers.size).toBe(12);
    expect(ev.total).toBe(1995); // 95 · Σmult(21); ≈ closed-form D_max 2000
    expect(ev.clearRate).toBe(0); // no Lances on the economy reference board
  });
});

describe('evaluateBoard — Lances yield clear-rate C; Relays boost both receivers', () => {
  it('a lone Lance yields its base intercept as C, no output', () => {
    const ev = evaluateBoard(viewOf(['lance', null, null, null], 2, 2));
    expect(ev.clearRate).toBe(PIECES.lance.intercept);
    expect(ev.total).toBe(0);
    expect(ev.towers.get('0,0')!.multiplier).toBe(1);
  });

  it('a Relay lifts a cross-adjacent Lance AND a cross-adjacent Reactor (the bridge)', () => {
    // Reactor at (0,0), Lance at (1,1), Relay at (1,0) cross-covers both.
    const ev = evaluateBoard(viewOf(['reactor', 'relay', null, 'lance'], 2, 2));
    const boosted = 1 + PIECES.relay.boost!;
    expect(ev.total).toBeCloseTo(PIECES.reactor.output! * boosted, 6);
    expect(ev.clearRate).toBeCloseTo(PIECES.lance.intercept! * boosted, 6);
  });

  it('C-vs-output is spatial: a Lance cell is a cell not producing', () => {
    const allReactors = evaluateBoard(viewOf(['reactor', 'reactor', 'reactor', 'reactor'], 2, 2));
    const oneLance = evaluateBoard(viewOf(['lance', 'reactor', 'reactor', 'reactor'], 2, 2));
    expect(oneLance.clearRate).toBe(PIECES.lance.intercept); // gained C
    expect(oneLance.total).toBeLessThan(allReactors.total); // lost that cell's output
  });
});

describe('evaluateBoard — the forward line: a Lance clears C only from a forward cell', () => {
  // A 4-tall column: forwardRows=2 marks y∈{0,1} as the salvo-ranged line.
  const column = (...cells: (PieceKind | null)[]) => viewOf(cells, 1, 4);

  it('a forward Lance (y < forwardRows) clears C; a Lance behind the line is inert', () => {
    const fwd = evaluateBoard(column('lance', null, null, null), 2); // Lance at y=0
    expect(fwd.clearRate).toBe(PIECES.lance.intercept);
    expect(fwd.towers.size).toBe(1);

    const back = evaluateBoard(column(null, null, 'lance', null), 2); // Lance at y=2
    expect(back.clearRate).toBe(0); // no C from behind the line
    expect(back.towers.size).toBe(0); // inert — not even a firing tower (draws no MW)
  });

  it('a Relay behind the line does not lift an inert back Lance', () => {
    // Lance at y=2, Relay cross-adjacent at y=1 — but the back Lance is not a receiver.
    const ev = evaluateBoard(column(null, 'relay', 'lance', null), 2);
    expect(ev.clearRate).toBe(0);
  });

  it('the default forwardRows is the whole board (position-agnostic pure evaluator)', () => {
    // No forwardRows arg → every row is forward, so a y=2 Lance still clears.
    const ev = evaluateBoard(column(null, null, 'lance', null));
    expect(ev.clearRate).toBe(PIECES.lance.intercept);
  });
});

describe('previewAt — the same evaluator over an overlay', () => {
  it('previewing a placement equals evaluating the board with the piece placed', () => {
    const base = ['reactor', null, null, null] as (PieceKind | null)[];
    const previewed = previewAt(viewOf(base, 2, 2), 'relay', 1, 0).total;
    const placed = evaluateBoard(viewOf(['reactor', 'relay', null, null], 2, 2)).total;
    expect(previewed).toBeCloseTo(placed, 6);
  });

  it('previewing null over an occupied cell models a removal', () => {
    const ev = previewAt(viewOf(['reactor', 'relay', null, null], 2, 2), null, 1, 0);
    expect(ev.total).toBe(PIECES.reactor.output); // Relay gone → boost removed
  });
});
