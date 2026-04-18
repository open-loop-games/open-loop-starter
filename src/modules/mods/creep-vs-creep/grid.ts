/**
 * SpatialGrid wiring + structure-level snapshot persistence.
 *
 * Per OL-493 spec: one `persistent()` ref holds the entire serialized grid
 * state. Per-cell `persistent()` is explicitly rejected — at MAP_WIDTH ×
 * MAP_HEIGHT = 3600 cells that would balloon the save schema.
 *
 * The plain-data grid mutates in place during ticks; we capture into the
 * snapshot ref on save and restore from it on load.
 *
 * Decimal boundary: runtime cells hold `DecimalSource` hp, but `JSON.stringify`
 * on a `Decimal` instance produces a POJO that loses Decimal semantics. The
 * snapshot ref stores cells as {@link PersistedCellState} (hp as string) and
 * the commit/hydrate helpers map at the boundary.
 */

import {
  createSpatialGrid,
  Decimal,
  persistent,
  type Persistent,
  type SpatialGrid,
  type SpatialGridSnapshot,
} from 'open-loop-engine';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  type CellState,
  type PersistedCellState,
} from './content';
import { generateSymmetricMap, type MapBlueprint } from './map';

export interface CreepGrid {
  grid: SpatialGrid<CellState>;
  blueprint: MapBlueprint;
  /** Single persisted snapshot. Engine save/load drives serialization. */
  snapshot: Persistent<SpatialGridSnapshot<PersistedCellState>>;
  /** Capture grid state into the snapshot ref. Call from `onSave`. */
  commit(): void;
  /** Replay snapshot back into the grid. Call from `onLoad`. */
  hydrate(): void;
}

function toPersisted(
  snap: SpatialGridSnapshot<CellState>,
): SpatialGridSnapshot<PersistedCellState> {
  return {
    width: snap.width,
    height: snap.height,
    cells: snap.cells.map((c) => ({
      terrain: c.terrain,
      owner: c.owner,
      hp: new Decimal(c.hp).toString(),
      reservoir: new Decimal(c.reservoir).toString(),
      ...(c.hotspotId !== undefined ? { hotspotId: c.hotspotId } : {}),
    })),
    passable: snap.passable,
    explored: snap.explored,
    visible: snap.visible,
  };
}

function fromPersisted(
  snap: SpatialGridSnapshot<PersistedCellState>,
): SpatialGridSnapshot<CellState> {
  return {
    width: snap.width,
    height: snap.height,
    cells: snap.cells.map((c) => ({
      terrain: c.terrain,
      owner: c.owner,
      hp: new Decimal(c.hp),
      reservoir: new Decimal(c.reservoir),
      ...(c.hotspotId !== undefined ? { hotspotId: c.hotspotId } : {}),
    })),
    passable: snap.passable,
    explored: snap.explored,
    visible: snap.visible,
  };
}

export function createCreepGrid(): CreepGrid {
  const blueprint = generateSymmetricMap();
  const grid = createSpatialGrid<CellState>({
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    initializer: (x, y) => blueprint.cells[y * MAP_WIDTH + x],
  });
  for (let i = 0; i < grid.passable.length; i++) {
    grid.passable[i] = blueprint.passable[i];
  }

  // Initialise the persistent default to the freshly-generated snapshot so
  // a brand-new save serializes to a coherent state on first autosave.
  const snapshot = persistent<SpatialGridSnapshot<PersistedCellState>>(
    toPersisted(grid.serialize()),
  );

  return {
    grid,
    blueprint,
    snapshot,
    commit() {
      snapshot.value = toPersisted(grid.serialize());
    },
    hydrate() {
      grid.restore(fromPersisted(snapshot.value));
    },
  };
}
