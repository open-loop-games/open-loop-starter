/**
 * The rock's geometry and the ward evaluator: pure functions over an occupancy view, so the
 * watch module, the placement preview and the probes all read the same arithmetic. The
 * saved state is the placed-piece list; the grid is rebuilt from it.
 */
import {
  createSpatialGrid,
  DIAGONAL_OFFSETS,
  ORTHOGONAL_OFFSETS,
  type GridOffset,
  type SpatialGrid,
} from '@open-loop/engine';
import type { Ground, PieceKind, Quarter } from '../data';

export const SIZE = 5;
export const CENTER = 2;

export interface Cell {
  x: number;
  y: number;
}

export interface Placed extends Cell {
  kind: PieceKind;
}

export function groundAt(x: number, y: number): Ground | 'tower' {
  if (x === CENTER && y === CENTER) return 'tower';
  return x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1 ? 'shore' : 'yard';
}

export function cellKey(x: number, y: number): string {
  return `${x}-${y}`;
}

/** Quarters a shore cell faces. Corners face two. */
export function quartersOf(x: number, y: number): Quarter[] {
  const q: Quarter[] = [];
  if (y === 0) q.push('N');
  if (y === SIZE - 1) q.push('S');
  if (x === 0) q.push('W');
  if (x === SIZE - 1) q.push('E');
  return q;
}

export const SHORE_CELLS: readonly Cell[] = (() => {
  const out: Cell[] = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) if (groundAt(x, y) === 'shore') out.push({ x, y });
  return out;
})();

/** The board as the ward evaluator sees it. */
export type OccupancyView = SpatialGrid<PieceKind | null>;

export function viewOf(placed: readonly Placed[]): OccupancyView {
  const grid = createSpatialGrid<PieceKind | null>({
    width: SIZE,
    height: SIZE,
    initializer: () => null,
  });
  for (const p of placed) grid.set(p.x, p.y, p.kind);
  return grid;
}

function countAround(
  view: OccupancyView,
  x: number,
  y: number,
  offsets: readonly GridOffset[],
  kind: PieceKind,
): number {
  let n = 0;
  for (const c of view.neighbors(x, y, offsets)) if (view.at(c.x, c.y) === kind) n++;
  return n;
}

/** Cells a winch reaches, and a buttress touches: the eight around it. */
export function ringAround(view: OccupancyView, x: number, y: number): Cell[] {
  return [...view.neighbors(x, y, DIAGONAL_OFFSETS)];
}

export interface WardFactors {
  wardPerWall: number;
  brace: number;
  buttress: number;
  /** Every multiplier outside the board: permanent knowledge and run-local finds. */
  mult: number;
}

/** Ward of one breakwater: braced by ring neighbours, stiffened by buttresses touching it. */
export function wallWard(view: OccupancyView, x: number, y: number, f: WardFactors): number {
  if (view.at(x, y) !== 'breakwater') return 0;
  // A shore cell's orthogonal shore neighbours are its two ring neighbours; yard cells never
  // hold breakwaters, so the count is exact.
  const braced = countAround(view, x, y, ORTHOGONAL_OFFSETS, 'breakwater');
  // DIAGONAL_OFFSETS is the full 8-neighbourhood, so a buttress behind a corner counts.
  const butts = countAround(view, x, y, DIAGONAL_OFFSETS, 'buttress');
  return f.wardPerWall * (1 + f.brace * braced) * (1 + f.buttress * butts) * f.mult;
}

/** Ward the struck quarter turns aside: the sum of its five shore cells. */
export function sideWard(view: OccupancyView, q: Quarter, f: WardFactors): number {
  let total = 0;
  for (const c of SHORE_CELLS)
    if (quartersOf(c.x, c.y).includes(q)) total += wallWard(view, c.x, c.y, f);
  return total;
}

export function sideWards(view: OccupancyView, f: WardFactors): Record<Quarter, number> {
  return {
    N: sideWard(view, 'N', f),
    E: sideWard(view, 'E', f),
    S: sideWard(view, 'S', f),
    W: sideWard(view, 'W', f),
  };
}
