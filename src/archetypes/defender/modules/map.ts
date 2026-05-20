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
  /** Bounded 2D grid sized `data.path.gridWidth × data.path.gridHeight`.
   *  Path cells (rasterized from the polyline) carry `type: 'path'`;
   *  remaining cells default to `'buildable'`. */
  grid: SpatialGrid<MapCell>;
  /** Total path length in lane units; sum of segment lengths between
   *  consecutive waypoints. Bloons walk `distanceAlongPath` from 0 to here. */
  pathTotalLength: number;
  /** Interpolate world position along the path at the given distance.
   *  Returns the [x, y] in grid-unit coordinates plus the segment index
   *  bloon is currently traversing. */
  positionAtDistance(distance: number): { x: number; y: number; segmentIndex: number };
  /** Read the cell at integer grid coordinates. */
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
 * Spatial grid + static path module. Phase 1 STUB — body lands in Phase 2
 * worktree A (single-Opus, parallel with tower + bloon module bodies).
 *
 * Phase 2 implementation will:
 *   1. Call `createSpatialGrid<MapCell>({ width: data.path.gridWidth,
 *      height: data.path.gridHeight, initializer: (x, y) => ({ type: 'buildable' }) })`.
 *   2. Rasterize the path polyline (`data.path.waypoints`) onto the grid,
 *      flipping each crossed cell to `type: 'path'`. Use Bresenham or
 *      per-segment grid-snap.
 *   3. Precompute `pathTotalLength` from the segment-length sum.
 *   4. Build `positionAtDistance` via binary-search over cumulative
 *      segment-length prefix sums + linear interpolation inside the segment.
 *   5. Expose `passabilityFn` as `(cell) => cell.type === 'path'`.
 *
 * TODO(expansion): if a second consumer needs dynamic re-pathing under
 * tower placement, graduate `createFlowField` (open-loop-engine
 * candidate-primitives.md § createFlowField — N=1 at Borglike today). Defender
 * arc 1's path is static so the hand-roll stays local.
 */
export function createMapModule(_data: DefenderData): EngineModule {
  return {
    id: 'defender/map',
    dependencies: ['defender/tuning'],
    install(_ctx) {
      // Phase 1 stub: publish the injection key but provide a no-op API that
      // throws on access. Phase 2 fills the body and replaces this.
      map = makeStubMap();
      _ctx.provide(MapKey, map);
    },
  };
}

function makeStubMap(): MapApi {
  const notImplemented = (method: string): never => {
    throw new Error(`defender/map: ${method} not implemented in Phase 1`);
  };
  return {
    get grid(): SpatialGrid<MapCell> {
      return notImplemented('grid');
    },
    get pathTotalLength(): number {
      return notImplemented('pathTotalLength');
    },
    positionAtDistance: () => notImplemented('positionAtDistance'),
    cellAt: () => notImplemented('cellAt'),
    passabilityFn: () => notImplemented('passabilityFn'),
  };
}
