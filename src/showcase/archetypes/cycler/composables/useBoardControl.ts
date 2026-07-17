import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { getBuild, getCycle, coveredCells } from '../modules';
import { PIECES, type PieceKind } from '../data/pieces';

/**
 * Board interaction control — the shared selection + hover + placement seam for the
 * placement grid (studio/open-loop-starter#21 leaf 5). Mirrors the multiverse-hr
 * seating pattern (`useSeatingGrid` + parent-owned selection/preview): the Muster
 * palette selects a piece, the board renders a `cellClasses` grammar and previews
 * the adjacency overlay on hover, and a click places (empty) or clears (occupied)
 * through the build module. The evaluator itself is cycler's already-lifted
 * `modules/adjacency.ts` — this composable only wires selection → preview → mutate.
 *
 * A singleton (module-scoped refs) so the two sibling panels share one selection.
 * Ephemeral UI state; a stale selection across a remount is harmless.
 */

export interface BoardCellView {
  readonly x: number;
  readonly y: number;
  readonly kind: PieceKind | null;
  /** On the salvo-ranged forward line (`y < forwardRows`). */
  readonly forward: boolean;
}

/** The prospective adjacency overlay for the hovered placement. */
interface Highlight {
  /** The would-be booster footprint cells (`"x,y"`). */
  readonly covered: ReadonlySet<string>;
  /** Footprint cells that are live receivers (lit brighter). */
  readonly boosted: ReadonlySet<string>;
  /** The hovered target cell. */
  readonly target: string;
}

export interface BoardControl {
  selectedKind: Ref<PieceKind | null>;
  hoverCell: Ref<{ x: number; y: number } | null>;
  /** The board as a grid of rows for `v-for`. */
  rows: ComputedRef<BoardCellView[][]>;
  /** The per-cell state class map — one grammar, the renderer only paints it. */
  cellClasses(cell: BoardCellView): Record<string, boolean>;
  /** Toggle a piece selection from the palette. */
  select(kind: PieceKind): void;
  /** Place the selected piece on an empty cell, or clear an occupied one. */
  onCellClick(cell: BoardCellView): void;
  onCellHover(cell: BoardCellView): void;
  onCellLeave(): void;
}

const selectedKind = ref<PieceKind | null>(null);
const hoverCell = ref<{ x: number; y: number } | null>(null);

export function useBoardControl(): BoardControl {
  const build = getBuild();
  const cycle = getCycle();
  const { width, height, forwardRows } = build;

  const rows = computed<BoardCellView[][]>(() => {
    const grid: BoardCellView[][] = [];
    for (let y = 0; y < height; y++) {
      const row: BoardCellView[] = [];
      for (let x = 0; x < width; x++) {
        row.push({ x, y, kind: build.pieceAt(x, y), forward: y < forwardRows });
      }
      grid.push(row);
    }
    return grid;
  });

  // The prospective overlay: a booster preview lights the receivers it would cover.
  const highlight = computed<Highlight | null>(() => {
    const kind = selectedKind.value;
    const h = hoverCell.value;
    if (!kind || !h || build.pieceAt(h.x, h.y) !== null) return null;
    const def = PIECES[kind];
    const covered = new Set<string>();
    const boosted = new Set<string>();
    if (def.role === 'booster' && def.shape) {
      for (const c of coveredCells(def.shape, h.x, h.y, width, height)) {
        covered.add(`${c.x},${c.y}`);
        const k = build.pieceAt(c.x, c.y);
        if (k === null) continue;
        const role = PIECES[k].role;
        if (role === 'producer' || (role === 'tower' && c.y < forwardRows)) {
          boosted.add(`${c.x},${c.y}`);
        }
      }
    }
    return { covered, boosted, target: `${h.x},${h.y}` };
  });

  // A forward Lance that is live and firing (INBOUND) — cosmetic muzzle state.
  const firing = computed(
    () => cycle.phase.value === 'inbound' || cycle.phase.value === 'saturation',
  );

  const cellClasses = (cell: BoardCellView): Record<string, boolean> => {
    const key = `${cell.x},${cell.y}`;
    const hl = highlight.value;
    const evalBoosted =
      (build.evaluation.value.producers.get(key)?.multiplier ?? 1) > 1 ||
      (build.evaluation.value.towers.get(key)?.multiplier ?? 1) > 1;
    return {
      empty: cell.kind === null,
      occupied: cell.kind !== null,
      forward: cell.forward,
      reactor: cell.kind === 'reactor',
      lance: cell.kind === 'lance',
      relay: cell.kind === 'relay',
      pylon: cell.kind === 'pylon',
      bulwark: cell.kind === 'bulwark',
      aura: evalBoosted,
      firing: firing.value && cell.kind === 'lance' && cell.forward,
      'drop-target': selectedKind.value !== null && cell.kind === null,
      'reach-covered': hl?.covered.has(key) ?? false,
      'reach-boosted': hl?.boosted.has(key) ?? false,
      'preview-target': hl?.target === key,
    };
  };

  const select = (kind: PieceKind): void => {
    selectedKind.value = selectedKind.value === kind ? null : kind;
  };

  const onCellClick = (cell: BoardCellView): void => {
    if (cell.kind !== null) {
      build.removeAt(cell.x, cell.y);
      return;
    }
    if (selectedKind.value) build.placeAt(cell.x, cell.y, selectedKind.value);
  };

  const onCellHover = (cell: BoardCellView): void => {
    hoverCell.value = { x: cell.x, y: cell.y };
  };
  const onCellLeave = (): void => {
    hoverCell.value = null;
  };

  return {
    selectedKind,
    hoverCell,
    rows,
    cellClasses,
    select,
    onCellClick,
    onCellHover,
    onCellLeave,
  };
}
