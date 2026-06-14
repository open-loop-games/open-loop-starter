import { createSpatialGrid } from '@open-loop/engine';
import type { EngineModule, InjectionKey, PassabilityFn, SpatialGrid } from '@open-loop/engine';
import type { DefenderData } from '../data/types';

/** Per-cell metadata on the spatial grid. */
export interface MapCell {
  type: 'path' | 'buildable' | 'blocked';
  /** Set by the towers module when a tower is placed in this cell. */
  towerInstanceId?: string;
}

/**
 * Map module's public API. Phase 2 worktree A fills the body — Phase 1 ships
 * the type contract only, with the factory's install() throwing on body-
 * dependent API calls.
 */
export interface MapApi {
  /** Bounded 2D grid sized `data.path.gridWidth × data.path.gridHeight`
   *  (placement grid; cell coords are integers in [0, gridWidth) × [0,
   *  gridHeight)). Path cells (rasterized from the polyline in cell
   *  space) carry `type: 'path'`; remaining cells default to `'buildable'`. */
  grid: SpatialGrid<MapCell>;
  /** Total path length in BTD1 pixels; sum of segment Euclidean lengths
   *  between consecutive waypoints, scaled by `data.path.cellSizePixels`.
   *  Bloons walk `distanceAlongPath` from 0 to here at `speedLaneUnitsPerSec`
   *  px/s (verbatim BTD1). */
  pathTotalLength: number;
  /** Interpolate world position along the path at the given pixel
   *  distance. Returns the [x, y] in BTD1 pixel coordinates plus the
   *  segment index the bloon is currently traversing. */
  positionAtDistance(distance: number): { x: number; y: number; segmentIndex: number };
  /** Read the cell at integer placement-grid coordinates. */
  cellAt(x: number, y: number): MapCell;
  /** Passability predicate suitable for `SpatialGrid.bfs` queries — returns
   *  true iff `cell.type === 'path'`. Bloon movement consumes this. */
  passabilityFn: PassabilityFn<MapCell>;
}

export const MapKey: InjectionKey<MapApi> = Symbol('defender/map') as InjectionKey<MapApi>;

let map: MapApi | null = null;

export function getMap(): MapApi {
  if (!map) throw new Error('defender/map: not installed yet');
  return map;
}

/**
 * Spatial grid + static path module. Constructs the bounded grid sized to
 * `data.path.gridWidth × data.path.gridHeight`, rasterizes the waypoint
 * polyline with Bresenham (integer-waypoint input → canonical 8-connected
 * cell trace, no gaps on diagonals), precomputes total + cumulative segment
 * lengths in lane units, and serves `positionAtDistance` via binary search
 * over the prefix-sum array.
 *
 * TODO(expansion): if a second consumer needs dynamic re-pathing under
 * tower placement, graduate `createFlowField` (open-loop-engine
 * candidate-primitives.md § createFlowField — N=1 at Borglike today). Defender
 * arc 1's path is static so the hand-roll stays local. The static prefix-sum
 * approach below becomes the N=2 graduation trigger the moment re-pathing
 * lands.
 */
export function createMapModule(data: DefenderData): EngineModule {
  return {
    id: 'defender/map',
    dependencies: ['defender/tuning'],
    install(ctx) {
      const { gridWidth, gridHeight, cellSizePixels, waypoints } = data.path;

      const grid = createSpatialGrid<MapCell>({
        width: gridWidth,
        height: gridHeight,
        initializer: () => ({ type: 'buildable' }),
      });

      // Rasterize the path polyline onto the placement grid. Each consecutive
      // waypoint pair contributes a Bresenham line in cell space; cells
      // touched flip to `'path'`. Waypoints may be floats (the BTD1-extracted
      // path uses sub-cell precision); round at the raster call site since
      // Bresenham needs integer endpoints. Out-of-bounds steps are silently
      // skipped — BTD1's path enters/exits off-stage by design.
      for (let i = 0; i < waypoints.length - 1; i++) {
        const [x0, y0] = waypoints[i];
        const [x1, y1] = waypoints[i + 1];
        rasterizeLine(grid, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1));
      }

      // Cumulative Euclidean length prefix sum, in BTD1 pixels.
      // `cumulative[i]` is the pixel distance from waypoint 0 to waypoint i
      // (cumulative[0] === 0). The total path length is the final entry.
      // Waypoints are cell coords; multiply each segment by cellSizePixels.
      const cumulative = new Float64Array(waypoints.length);
      cumulative[0] = 0;
      for (let i = 1; i < waypoints.length; i++) {
        const [px, py] = waypoints[i - 1];
        const [qx, qy] = waypoints[i];
        const dx = qx - px;
        const dy = qy - py;
        cumulative[i] = cumulative[i - 1] + Math.hypot(dx, dy) * cellSizePixels;
      }
      const pathTotalLength = cumulative[cumulative.length - 1];

      function positionAtDistance(distance: number): {
        x: number;
        y: number;
        segmentIndex: number;
      } {
        // Clamp policy: below 0 returns the spawn waypoint at segment 0;
        // beyond total returns the exit waypoint at the final segment. The
        // wave/bloon module owns the despawn/leak decision when a bloon's
        // distanceAlongPath exceeds pathTotalLength — this function stays
        // total so callers can probe positions either side of the bounds
        // without throwing. Returned coords are in BTD1 pixels.
        if (distance <= 0) {
          const [cx, cy] = waypoints[0];
          return { x: cx * cellSizePixels, y: cy * cellSizePixels, segmentIndex: 0 };
        }
        if (distance >= pathTotalLength) {
          const [cx, cy] = waypoints[waypoints.length - 1];
          return {
            x: cx * cellSizePixels,
            y: cy * cellSizePixels,
            segmentIndex: waypoints.length - 2,
          };
        }

        // Binary search the cumulative array for the segment index `i`
        // satisfying cumulative[i] <= distance < cumulative[i+1]. cumulative
        // is monotonically non-decreasing so this is well-defined; the
        // pathTotalLength > 0 check above plus the distance >= total guard
        // ensure i is always in [0, waypoints.length - 2].
        let lo = 0;
        let hi = cumulative.length - 1;
        while (lo + 1 < hi) {
          const mid = (lo + hi) >>> 1;
          if (cumulative[mid] <= distance) lo = mid;
          else hi = mid;
        }
        const segStart = cumulative[lo];
        const segEnd = cumulative[lo + 1];
        const segLen = segEnd - segStart;
        // segLen > 0 always: zero-length segments only occur if two
        // adjacent waypoints coincide, which data/path.ts excludes by
        // design (13 distinct integer waypoints). Guarding against /0
        // would mask an authoring bug, not handle a runtime case.
        const t = (distance - segStart) / segLen;
        const [ax, ay] = waypoints[lo];
        const [bx, by] = waypoints[lo + 1];
        return {
          x: (ax + (bx - ax) * t) * cellSizePixels,
          y: (ay + (by - ay) * t) * cellSizePixels,
          segmentIndex: lo,
        };
      }

      function cellAt(x: number, y: number): MapCell {
        return grid.at(x, y);
      }

      const passabilityFn: PassabilityFn<MapCell> = (cell) => cell.type === 'path';

      const api: MapApi = {
        grid,
        pathTotalLength,
        positionAtDistance,
        cellAt,
        passabilityFn,
      };
      map = api;
      ctx.provide(MapKey, api);
    },
  };
}

/**
 * Bresenham line rasterizer — flips every grid cell crossed by the segment
 * from `(x0, y0)` to `(x1, y1)` (inclusive of both endpoints) to
 * `type: 'path'`, preserving any existing `towerInstanceId` field (cells
 * default to `buildable` with no tower at construction, so this only
 * matters if a future consumer pre-seeds tower state before path rasterize
 * — currently a no-op preservation).
 *
 * Classic integer-only 8-connected variant: equal handling of all four
 * octants via signed deltas + an error accumulator. Endpoint waypoints
 * shared across consecutive segments are flipped twice (idempotent — the
 * second `set` re-writes the same `'path'` cell type and emits a benign
 * `cellChanged` event with prev === next, which the engine's contract
 * explicitly allows).
 */
function rasterizeLine(
  grid: SpatialGrid<MapCell>,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    if (grid.inBounds(x, y)) {
      const prev = grid.at(x, y);
      grid.set(x, y, { ...prev, type: 'path' });
    }
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}
