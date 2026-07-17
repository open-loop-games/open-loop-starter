import {
  Decimal,
  createSpatialGrid,
  persistent,
  withPersistentContext,
  type EngineModule,
  type InjectionKey,
  type ComputedRef,
  type SpatialGrid,
} from '@open-loop/engine';
import { computed } from 'vue';
import { BUILD_BALANCE, type BuildBalance } from '../data/build';
import { BOARD, REFERENCE_LAYOUT, type PieceKind } from '../data/pieces';
import { evaluateBoard, previewAt, type BoardEvaluation, type OccupancyView } from './adjacency';

/**
 * Build module — the shared placement grid and the saturating capacity ceiling
 * D_max (see `../IDENTITY.md` § One shared surface; studio/open-loop-starter#21
 * leaf 2). A real `createSpatialGrid` board holds Reactors (producers) and Relays
 * (boosters); a lifted, pure adjacency evaluator (`./adjacency.ts`) turns occupancy
 * into realized output. This replaces the old scalar `placed` count — the board is
 * now live, and preview is the same evaluator over an overlay.
 *
 * Two capacity reads, deliberately distinct:
 *   • `capacity` — the REALIZED output of the current board (evaluator over live
 *     occupancy, scaled by permanent power). The live/UI value; leaf 3 (Lances)
 *     reads C off this substrate.
 *   • `dMax` — the closed-form saturated ceiling `boardCells · baseOutputCeiling ·
 *     adjacencyBoost · producerUpgradeRatio^L` (the multiverse-hr #17 correction:
 *     finite board ⇒ log crossing). UNCHANGED — the kernel peg and prestige currency
 *     read this, so the realized board becoming live disturbs neither. The reference
 *     full board reconciles the two: realized ≈ D_max (locked in `sim/build.test.ts`).
 *
 * The grid is a rebuildable index over the persisted `placements` array (mirrors the
 * mv-hr grid module): occupancy is the save format, the SpatialGrid is the live index
 * rebuilt from it on install/load, so adjacency queries and cell events run on a real
 * grid without persisting per-cell.
 */
export interface BuildApi {
  /** Permanent power level L (prestige-carried). D_max ∝ producerUpgradeRatio^L. */
  powerLevel: ComputedRef<number>;
  /** Pieces placed on the board this run (0..boardCells). */
  placed: ComputedRef<number>;
  /** Realized within-run output of the live board (evaluator over occupancy). */
  capacity: ComputedRef<Decimal>;
  /** Saturated closed-form ceiling at the current L. The peg's D_max (unchanged). */
  dMax: ComputedRef<Decimal>;
  /** Total placement cells (width·height) — the finite-board saturation source. */
  boardCells: number;
  /** Board width in cells. */
  width: number;
  /** Board height in cells. */
  height: number;
  /** The piece kind at (x, y), or null. */
  pieceAt(x: number, y: number): PieceKind | null;
  /** Realized per-cell breakdown of the live board (multiplier + output per producer). */
  evaluation: ComputedRef<BoardEvaluation>;
  /** Place a piece at (x, y). Returns false if the cell is occupied or out of bounds. */
  placeAt(x: number, y: number, kind: PieceKind): boolean;
  /** Clear the cell at (x, y). No-op if already empty. */
  removeAt(x: number, y: number): void;
  /** Board evaluation as it would be with `kind` at (x, y) — the hover preview. */
  preview(kind: PieceKind | null, x: number, y: number): BoardEvaluation;
  /** Place one Reactor at the first empty cell. Returns false if the board is full. */
  placeProducer(): boolean;
  /** Fill the board with the reference layout — the setup-grace rebuild (automation/UI). */
  fillBoard(): void;
  /** Raise permanent power by one level (called at prestige). Reach, not pacing. */
  raisePower(): void;
  /** Clear placements for a new run; permanent level L survives. */
  resetRun(): void;
}

export const BuildKey: InjectionKey<BuildApi> = Symbol('cycler/build') as InjectionKey<BuildApi>;

let build: BuildApi | null = null;

export function getBuild(): BuildApi {
  if (!build) throw new Error('cycler/build: not installed yet');
  return build;
}

export interface BuildModuleOptions {
  build?: BuildBalance;
}

interface BoardCell {
  piece: PieceKind | null;
}

export function createBuildModule(options: BuildModuleOptions = {}): EngineModule {
  const data = options.build ?? BUILD_BALANCE;
  const { boardCells, baseOutputCeiling, adjacencyBoost, producerUpgradeRatio } = data;
  const { width, height } = BOARD;
  const cellCount = width * height;

  return {
    id: 'cycler/build',
    install(ctx) {
      const state = withPersistentContext('cycler/build', () => ({
        // Row-major occupancy — the save format; the grid is rebuilt from it.
        placements: persistent<(PieceKind | null)[]>(Array(cellCount).fill(null), {
          name: 'placements',
        }),
        powerLevel: persistent<number>(0, { name: 'power-level' }),
      }));

      // The SpatialGrid is a rebuildable index over the persisted `placements`
      // array (the authoritative, reactive occupancy). Evaluation and reads track
      // `placements`; the grid mirrors it for cell events + neighbour queries (UI,
      // and leaf 3's Lance adjacency).
      const grid: SpatialGrid<BoardCell> = createSpatialGrid<BoardCell>({
        width,
        height,
        initializer: () => ({ piece: null }),
      });
      const syncGridFromPlacements = (): void => {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            grid.set(x, y, { piece: state.placements.value[y * width + x] ?? null });
          }
        }
      };
      syncGridFromPlacements();
      ctx.onLoad(syncGridFromPlacements);

      const pieceAt = (x: number, y: number): PieceKind | null =>
        grid.inBounds(x, y) ? (state.placements.value[y * width + x] ?? null) : null;
      const liveView: OccupancyView = { width, height, pieceAt };

      const setCell = (x: number, y: number, kind: PieceKind | null): void => {
        const next = state.placements.value.slice();
        next[y * width + x] = kind;
        state.placements.value = next;
        grid.set(x, y, { piece: kind });
      };

      const powerMult = computed(() => Decimal.pow(producerUpgradeRatio, state.powerLevel.value));
      const evaluation = computed<BoardEvaluation>(() => evaluateBoard(liveView));
      const capacity = computed(() => powerMult.value.mul(evaluation.value.total));
      // The authored ceiling — unchanged closed form (the peg + currency read this).
      const dMax = computed(() =>
        powerMult.value.mul(boardCells).mul(baseOutputCeiling).mul(adjacencyBoost),
      );
      const placed = computed(() => state.placements.value.reduce((n, p) => (p ? n + 1 : n), 0));

      const inBounds = (x: number, y: number) => grid.inBounds(x, y);

      const placeAt = (x: number, y: number, kind: PieceKind): boolean => {
        if (!inBounds(x, y) || grid.at(x, y).piece !== null) return false;
        setCell(x, y, kind);
        return true;
      };
      const removeAt = (x: number, y: number): void => {
        if (!inBounds(x, y) || grid.at(x, y).piece === null) return;
        setCell(x, y, null);
      };
      const placeProducer = (): boolean => {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (grid.at(x, y).piece === null) return placeAt(x, y, 'reactor');
          }
        }
        return false;
      };
      const fillBoard = (): void => {
        state.placements.value = REFERENCE_LAYOUT.slice();
        syncGridFromPlacements();
      };
      const raisePower = (): void => {
        state.powerLevel.value += 1;
      };
      const resetRun = (): void => {
        state.placements.value = Array(cellCount).fill(null);
        syncGridFromPlacements();
      };

      const api: BuildApi = {
        powerLevel: computed(() => state.powerLevel.value),
        placed,
        capacity,
        dMax,
        boardCells: cellCount,
        width,
        height,
        pieceAt: (x, y) => liveView.pieceAt(x, y),
        evaluation,
        placeAt,
        removeAt,
        preview: (kind, x, y) => previewAt(liveView, kind, x, y),
        placeProducer,
        fillBoard,
        raisePower,
        resetRun,
      };
      build = api;
      ctx.provide(BuildKey, api);
    },
  };
}
