/**
 * SpatialGrid wiring + structure-level snapshot persistence.
 *
 * Per OL-493 spec: one `persistent()` ref holds the entire serialized grid
 * state. Per-cell `persistent()` is explicitly rejected — at width × height
 * cells that would balloon the save schema.
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
import type { DirectorVars } from '@/archetypes/director';
import {
  type CellState,
  type FactionId,
  type PersistedCellState,
} from './content';
import { generateSymmetricMap, type MapBlueprint } from './map';

export interface CreepGrid {
  grid: SpatialGrid<CellState>;
  /**
   * Stable blueprint object — the reference never changes. On
   * {@link regenerate} its `.spawns` and `.cells` contents are overwritten
   * in place so consumers holding array references stay live.
   */
  blueprint: MapBlueprint;
  /** Single persisted snapshot. Engine save/load drives serialization. */
  snapshot: Persistent<SpatialGridSnapshot<PersistedCellState>>;
  /** Capture grid state into the snapshot ref. Call from `onSave`. */
  commit(): void;
  /** Replay snapshot back into the grid. Call from `onLoad`. */
  hydrate(): void;
  /**
   * Rebuild the blueprint with a (possibly reshuffled) faction→corner
   * assignment and reinitialise the SpatialGrid to match. Used by the round
   * system on reset to wipe all in-place cell mutations cleanly and assign
   * new starting corners per OL-511.
   */
  regenerate(factionOrder: readonly FactionId[]): void;
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

export function createCreepGrid(vars: DirectorVars): CreepGrid {
  const blueprint = generateSymmetricMap({
    archetype: vars.archetype,
    balance: vars.balance,
  });
  const grid = createSpatialGrid<CellState>({
    width: blueprint.width,
    height: blueprint.height,
    initializer: (x, y) => blueprint.cells[y * blueprint.width + x],
  });
  for (let i = 0; i < grid.passable.length; i++) {
    grid.passable[i] = blueprint.passable[i];
  }

  // Initialise the persistent default to the freshly-generated snapshot so
  // a brand-new save serializes to a coherent state on first autosave.
  const snapshot = persistent<SpatialGridSnapshot<PersistedCellState>>(
    toPersisted(grid.serialize()),
  );

  function regenerate(factionOrder: readonly FactionId[]): void {
    const fresh = generateSymmetricMap({
      archetype: vars.archetype,
      balance: vars.balance,
      factionOrder,
    });
    // Mutate in place so AI spawn-proximity lookups (ai.ts `spawns()` getter)
    // and any external consumers holding `blueprint.cells` etc. see the new
    // geometry without re-capturing references.
    blueprint.cells.length = 0;
    blueprint.cells.push(...fresh.cells);
    blueprint.passable.length = 0;
    blueprint.passable.push(...fresh.passable);
    blueprint.spawns.length = 0;
    blueprint.spawns.push(...fresh.spawns);
    // hotspots are geometry-stable across rounds — array identity preserved.

    // Re-seed the spatial grid from the fresh blueprint. Using restore rather
    // than per-cell set avoids firing one `cellChanged` emit per cell; the
    // round transition is not an incremental mutation.
    const size = grid.width * grid.height;
    grid.restore({
      width: grid.width,
      height: grid.height,
      cells: blueprint.cells.map((c) => ({ ...c })),
      passable: [...blueprint.passable],
      explored: new Array(size).fill(0),
      visible: new Array(size).fill(0),
    });
    snapshot.value = toPersisted(grid.serialize());
  }

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
    regenerate,
  };
}
