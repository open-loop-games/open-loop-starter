/**
 * Adjacency evaluation — the pure synergy function over grid occupancy.
 *
 * Lifted (subtractive) from the multiverse-hr Cycler pivot's `adjacency.ts`
 * (`/work/studio/multiverse-hr/src/modules/adjacency.ts`): the same booster-centric,
 * one-directional shape — iterate boosters, push additive contributions onto covered
 * in-profile producers, hybrid stacking (same-type additive, cross-type product) —
 * stripped of that game's manager/party/realm/burnout quirk layers down to cycler's
 * two pieces (Reactor = producer, Relay = booster).
 *
 * Pure over an {@link OccupancyView} rather than a live grid, so placement PREVIEW is
 * the same function run against an overlay (`previewAt`), and the evaluator stays
 * engine-harness testable with no module state. This is the "one pure fn drives live
 * board + hover preview" the rework calls for (studio/open-loop-starter#21 leaf 2).
 */

import { PIECES, type ConnectionShape, type PieceKind } from '../data/pieces';

/**
 * The read abstraction the evaluator works against. The live board and a
 * placement-preview overlay both implement it — occupancy only, no engine coupling.
 */
export interface OccupancyView {
  readonly width: number;
  readonly height: number;
  /** The piece kind at (x, y), or null for an empty cell. Out of bounds → null. */
  pieceAt(x: number, y: number): PieceKind | null;
}

/** One producer's realized state after adjacency: its multiplier and output. */
export interface ProducerCell {
  readonly x: number;
  readonly y: number;
  /** Output multiplier from covering boosters: 1 + Σ boost (single additive group). */
  readonly multiplier: number;
  /** Realized output = base output · multiplier (before permanent-power scaling). */
  readonly output: number;
}

export interface BoardEvaluation {
  /** Aggregate realized producer output (before permanent-power scaling). */
  readonly total: number;
  /** Per-producer breakdown, keyed by `"x,y"` — the UI's per-cell readout. */
  readonly producers: ReadonlyMap<string, ProducerCell>;
}

/**
 * Evaluate the board's realized output. Booster-centric: each booster pushes an
 * additive boost onto every producer it covers; a producer's multiplier is
 * `1 + Σ boost` (one booster type ⇒ one additive group — the degenerate case of
 * mv-hr's hybrid stacking). Boosters produce nothing directly.
 */
export function evaluateBoard(view: OccupancyView): BoardEvaluation {
  const boostAcc = new Map<string, number>(); // "x,y" of a producer → Σ boost fraction
  const producerCoords: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < view.height; y++) {
    for (let x = 0; x < view.width; x++) {
      const kind = view.pieceAt(x, y);
      if (kind === null) continue;
      const def = PIECES[kind];
      if (def.role === 'producer') {
        producerCoords.push({ x, y });
        const key = `${x},${y}`;
        if (!boostAcc.has(key)) boostAcc.set(key, 0);
      } else if (def.role === 'booster' && def.boost !== undefined && def.shape) {
        for (const c of coveredCells(def.shape, x, y, view.width, view.height)) {
          if (PIECES[view.pieceAt(c.x, c.y) ?? 'relay']?.role !== 'producer') continue;
          const key = `${c.x},${c.y}`;
          boostAcc.set(key, (boostAcc.get(key) ?? 0) + def.boost);
        }
      }
    }
  }

  const producers = new Map<string, ProducerCell>();
  let total = 0;
  for (const { x, y } of producerCoords) {
    const key = `${x},${y}`;
    const kind = view.pieceAt(x, y)!;
    const base = PIECES[kind].output ?? 0;
    const multiplier = 1 + (boostAcc.get(key) ?? 0);
    const output = base * multiplier;
    producers.set(key, { x, y, multiplier, output });
    total += output;
  }
  return { total, producers };
}

/**
 * Board evaluation as it WOULD be if `kind` sat at (x, y) — the hover preview.
 * Pure overlay; the live view is untouched. `null` previews a removal.
 */
export function previewAt(
  view: OccupancyView,
  kind: PieceKind | null,
  x: number,
  y: number,
): BoardEvaluation {
  return evaluateBoard({
    ...view,
    pieceAt: (cx, cy) => (cx === x && cy === y ? kind : view.pieceAt(cx, cy)),
  });
}

/**
 * Cells a booster at (x, y) reaches with the given connection shape, clipped to a
 * width×height board. `cross` = 4-connected, `diagonal` = the 4 corners, `ring` =
 * the 8-connected Moore neighbourhood. Mirrors the mv-hr evaluator's semantics.
 */
export function coveredCells(
  shape: ConnectionShape,
  x: number,
  y: number,
  width: number,
  height: number,
): Array<{ x: number; y: number }> {
  const inBounds = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < width && cy < height;
  const push = (
    coords: Array<{ x: number; y: number }>,
    pairs: ReadonlyArray<readonly [number, number]>,
  ) => {
    for (const [cx, cy] of pairs) if (inBounds(cx, cy)) coords.push({ x: cx, y: cy });
    return coords;
  };
  const cross: ReadonlyArray<readonly [number, number]> = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];
  const diagonal: ReadonlyArray<readonly [number, number]> = [
    [x - 1, y - 1],
    [x + 1, y - 1],
    [x - 1, y + 1],
    [x + 1, y + 1],
  ];
  switch (shape) {
    case 'cross':
      return push([], cross);
    case 'diagonal':
      return push([], diagonal);
    case 'ring':
      return push(push([], cross), diagonal);
  }
}
