import {
  Decimal,
  createSpatialGrid,
  persistent,
  tunable,
  unref,
  withPersistentContext,
  type EngineModule,
  type InjectionKey,
  type ComputedRef,
  type SpatialGrid,
} from '@open-loop/engine';
import { computed } from 'vue';
import { BUILD_BALANCE } from '../data/build';
import { DEFENSE_BALANCE } from '../data/defense';
import { BOARD, PIECES, REFERENCE_LAYOUT, type PieceKind } from '../data/pieces';
import { CyclerTuningRegistryKey, type CyclerTunableKey } from './tuning';
import { evaluateBoard, previewAt, type BoardEvaluation, type OccupancyView } from './adjacency';

/**
 * Build module — the shared placement grid and the saturating capacity ceiling
 * D_max (see `../IDENTITY.md` § One shared surface; studio/open-loop-starter#21
 * leaf 2). A real `createSpatialGrid` board holds Reactors (producers) and Relays
 * (boosters); a lifted, pure adjacency evaluator (`./adjacency.ts`) turns occupancy
 * into realized output. This replaces the old scalar `placed` count — the board is
 * now live, and preview is the same evaluator over an overlay.
 *
 * Capacity reads, deliberately distinct:
 *   • `capacity` / `clearRate` — the REALIZED output / clear-rate C of the current
 *     board (evaluator over live occupancy, scaled by permanent power). The live/UI
 *     values; leak resolves against realized `clearRate`.
 *   • `dMax` — the closed-form saturated OUTPUT ceiling `boardCells · baseOutputCeiling ·
 *     adjacencyBoost · producerUpgradeRatio^L` (the multiverse-hr #17 correction:
 *     finite board ⇒ log crossing). UNCHANGED — prestige currency reads this. The
 *     reference full board reconciles it: realized ≈ D_max (see `build.test.ts`).
 *   • `cMax` — the closed-form saturated CLEAR-RATE ceiling `forwardCells ·
 *     lanceIntercept · adjacencyBoost · producerUpgradeRatio^L` (mirror of dMax). The
 *     kernel freezes the salvo peg `W₀ = cMax/H` against it; because leak resolves
 *     against realized `clearRate`, under-fielding Lances (clearRate < cMax) breaches
 *     the line early — the committed C-vs-output tension, live.
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
  /** Realized within-run producer output MW of the live board (evaluator over occupancy). */
  capacity: ComputedRef<Decimal>;
  /** Realized clear-rate C — aggregate Lance interception, boosted, scaled by power. */
  clearRate: ComputedRef<Decimal>;
  /** MW the placed Lances draw to fire during INBOUND — the within-run economic sink. */
  fireDraw: ComputedRef<Decimal>;
  /** MW surplus = producer output − Lance fire-draw (≥0); the repair budget. */
  mwSurplus: ComputedRef<Decimal>;
  /** Saturated closed-form ceiling at the current L. The peg's D_max (unchanged). */
  dMax: ComputedRef<Decimal>;
  /** Saturated closed-form CLEAR-RATE ceiling — the C peg the kernel reads (forwardCells all Lanced + adjacency). Mirror of dMax. */
  cMax: ComputedRef<Decimal>;
  /** Bulwarks placed this run — the repair-throughput count. */
  bulwarkCount: ComputedRef<number>;
  /** Line-HP repair the board can route per STANDBY = (baseRepair + n·throughput)·power. Caps the surplus→line drip. */
  repairCapacity: ComputedRef<Decimal>;
  /** Total placement cells (width·height) — the finite-board saturation source. */
  boardCells: number;
  /** Board width in cells. */
  width: number;
  /** Board height in cells. */
  height: number;
  /** The salvo-ranged forward rows (`y < forwardRows`) — where Lances clear C. The UI shades this zone. */
  forwardRows: number;
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

interface BoardCell {
  piece: PieceKind | null;
}

export function createBuildModule(): EngineModule {
  // Structural cardinality — board and zone shape, not balance. Stays in the
  // data layer per the engine guide § Where balance constants live.
  const { boardCells } = BUILD_BALANCE;
  const { forwardCells, forwardRows } = DEFENSE_BALANCE;
  const bulwarkThroughput = PIECES.bulwark.throughput ?? 0;
  const { width, height } = BOARD;
  const cellCount = width * height;

  return {
    id: 'cycler/build',
    dependencies: ['cycler/tuning'],
    install(ctx) {
      // The ceiling terms bind through the tuning registry. Each is read inside
      // a `computed`, so a pushed scope re-derives dMax / cMax / repair on the
      // next read rather than needing a rebuild.
      const registry = ctx.inject(CyclerTuningRegistryKey);
      const t = (key: CyclerTunableKey, fallback: number) => tunable(registry, key, () => fallback);

      const baseOutputCeiling = t('capacity/baseOutputCeiling', BUILD_BALANCE.baseOutputCeiling);
      const adjacencyBoost = t('capacity/adjacencyBoost', BUILD_BALANCE.adjacencyBoost);
      const producerUpgradeRatio = t(
        'capacity/producerUpgradeRatio',
        BUILD_BALANCE.producerUpgradeRatio,
      );
      const lanceIntercept = t('capacity/lanceIntercept', DEFENSE_BALANCE.lanceIntercept);
      const baseRepair = t('line/baseRepair', DEFENSE_BALANCE.baseRepair);
      const state = withPersistentContext('cycler/build', () => ({
        // Row-major occupancy — the save format; the grid is rebuilt from it.
        placements: persistent<(PieceKind | null)[]>(Array(cellCount).fill(null), {
          id: 'placements',
        }),
        powerLevel: persistent<number>(0, { id: 'power-level' }),
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

      const powerMult = computed(() =>
        Decimal.pow(unref(producerUpgradeRatio), state.powerLevel.value),
      );
      const evaluation = computed<BoardEvaluation>(() => evaluateBoard(liveView, forwardRows));
      const capacity = computed(() => powerMult.value.mul(evaluation.value.total));
      const clearRate = computed(() => powerMult.value.mul(evaluation.value.clearRate));
      // Each Lance draws `PIECES.lance.draw` MW to fire; power scales it like output.
      const fireDraw = computed(() =>
        powerMult.value.mul(evaluation.value.towers.size).mul(PIECES.lance.draw ?? 0),
      );
      const mwSurplus = computed(() => Decimal.max(0, capacity.value.sub(fireDraw.value)));
      // The authored OUTPUT ceiling — unchanged closed form (prestige currency reads this).
      const dMax = computed(() =>
        powerMult.value.mul(boardCells).mul(unref(baseOutputCeiling)).mul(unref(adjacencyBoost)),
      );
      // The authored CLEAR-RATE ceiling — the C peg the kernel freezes W₀ against
      // (all forward cells Lanced + full adjacency). Mirror of dMax; leak resolves
      // against realized `clearRate`, so under-fielding Lances breaches early.
      const cMax = computed(() =>
        powerMult.value.mul(forwardCells).mul(unref(lanceIntercept)).mul(unref(adjacencyBoost)),
      );
      const bulwarkCount = computed(() =>
        state.placements.value.reduce((n, p) => (p === 'bulwark' ? n + 1 : n), 0),
      );
      // Line-HP the board can route into the wall per STANDBY: a baseline trickle
      // plus each Bulwark's throughput, scaled by power (so Δ_wall stays power-invariant).
      const repairCapacity = computed(() =>
        powerMult.value.mul(Number(unref(baseRepair)) + bulwarkCount.value * bulwarkThroughput),
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
        clearRate,
        fireDraw,
        mwSurplus,
        dMax,
        cMax,
        bulwarkCount,
        repairCapacity,
        boardCells: cellCount,
        width,
        height,
        forwardRows,
        pieceAt: (x, y) => liveView.pieceAt(x, y),
        evaluation,
        placeAt,
        removeAt,
        preview: (kind, x, y) => previewAt(liveView, kind, x, y, forwardRows),
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
