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

/** One boostable cell's realized state after adjacency: its multiplier and value. */
export interface ReceiverCell {
  readonly x: number;
  readonly y: number;
  /** Multiplier from covering boosters: 1 + Σ boost (single additive group). */
  readonly multiplier: number;
  /** Realized value = base (output for producers, intercept for towers) · multiplier. */
  readonly value: number;
}

export interface BoardEvaluation {
  /** Aggregate realized producer output MW (before permanent-power scaling). */
  readonly total: number;
  /** Aggregate realized tower clear-rate C (before permanent-power scaling). */
  readonly clearRate: number;
  /** Per-producer breakdown, keyed by `"x,y"`. */
  readonly producers: ReadonlyMap<string, ReceiverCell>;
  /** Per-tower breakdown, keyed by `"x,y"`. */
  readonly towers: ReadonlyMap<string, ReceiverCell>;
}

/**
 * Evaluate the board's realized output MW and clear-rate C. Booster-centric: each
 * booster pushes an additive boost onto every *receiver* it covers — producers
 * (Reactors) AND towers (Lances), the bridge that makes one system. A receiver's
 * multiplier is `1 + Σ boost` (one booster type ⇒ one additive group — the
 * degenerate case of mv-hr's hybrid stacking). Boosters emit nothing themselves.
 */
export function evaluateBoard(view: OccupancyView): BoardEvaluation {
  const boostAcc = new Map<string, number>(); // "x,y" of a receiver → Σ boost fraction
  const receivers: Array<{ x: number; y: number; role: 'producer' | 'tower' }> = [];

  const isReceiver = (x: number, y: number): boolean => {
    const kind = view.pieceAt(x, y);
    if (kind === null) return false;
    const role = PIECES[kind].role;
    return role === 'producer' || role === 'tower';
  };

  for (let y = 0; y < view.height; y++) {
    for (let x = 0; x < view.width; x++) {
      const kind = view.pieceAt(x, y);
      if (kind === null) continue;
      const def = PIECES[kind];
      if (def.role === 'producer' || def.role === 'tower') {
        receivers.push({ x, y, role: def.role });
        const key = `${x},${y}`;
        if (!boostAcc.has(key)) boostAcc.set(key, 0);
      } else if (def.role === 'booster' && def.boost !== undefined && def.shape) {
        for (const c of coveredCells(def.shape, x, y, view.width, view.height)) {
          if (!isReceiver(c.x, c.y)) continue;
          const key = `${c.x},${c.y}`;
          boostAcc.set(key, (boostAcc.get(key) ?? 0) + def.boost);
        }
      }
    }
  }

  const producers = new Map<string, ReceiverCell>();
  const towers = new Map<string, ReceiverCell>();
  let total = 0;
  let clearRate = 0;
  for (const { x, y, role } of receivers) {
    const key = `${x},${y}`;
    const def = PIECES[view.pieceAt(x, y)!];
    const base = role === 'producer' ? (def.output ?? 0) : (def.intercept ?? 0);
    const multiplier = 1 + (boostAcc.get(key) ?? 0);
    const value = base * multiplier;
    if (role === 'producer') {
      producers.set(key, { x, y, multiplier, value });
      total += value;
    } else {
      towers.set(key, { x, y, multiplier, value });
      clearRate += value;
    }
  }
  return { total, clearRate, producers, towers };
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
