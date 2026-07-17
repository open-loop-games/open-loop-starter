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
