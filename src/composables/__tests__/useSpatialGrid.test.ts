import { describe, it, expect } from 'vitest';
import { effectScope } from 'vue';
import { createSpatialGrid } from '@open-loop/engine';
import { useSpatialGrid } from '../useSpatialGrid';

interface Tile {
  kind: 'floor' | 'wall';
}

function buildGrid() {
  return createSpatialGrid<Tile>({
    width: 4,
    height: 3,
    initializer: () => ({ kind: 'floor' }),
  });
}

describe('useSpatialGrid', () => {
  it('cell() returns current value and updates when grid.set fires cellChanged', () => {
    const grid = buildGrid();
    const scope = effectScope();
    scope.run(() => {
      const view = useSpatialGrid(grid);
      const cell = view.cell(1, 1);
      expect(cell.value).toEqual({ kind: 'floor' });
      grid.set(1, 1, { kind: 'wall' });
      expect(cell.value).toEqual({ kind: 'wall' });
    });
    scope.stop();
  });

  it('cell() returns undefined for out-of-bounds coordinates', () => {
    const grid = buildGrid();
    const scope = effectScope();
    scope.run(() => {
      const view = useSpatialGrid(grid);
      expect(view.cell(-1, 0).value).toBeUndefined();
      expect(view.cell(99, 99).value).toBeUndefined();
    });
    scope.stop();
  });

  it('cell() memoizes — same coords return the same ref', () => {
    const grid = buildGrid();
    const scope = effectScope();
    scope.run(() => {
      const view = useSpatialGrid(grid);
      expect(view.cell(2, 1)).toBe(view.cell(2, 1));
      expect(view.cell(2, 1)).not.toBe(view.cell(3, 1));
    });
    scope.stop();
  });

  it('visibleCells tracks FOV commits', () => {
    const grid = buildGrid();
    const scope = effectScope();
    scope.run(() => {
      const view = useSpatialGrid(grid);
      expect(view.visibleCells.value).toEqual([]);

      const fov = grid.beginFovUpdate();
      fov.markVisible(0, 0);
      fov.markVisible(1, 0);
      fov.commit();

      expect(view.visibleCells.value).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]);
      expect(view.exploredCells.value).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]);
    });
    scope.stop();
  });

  it('exploredCells persists after FOV clears', () => {
    const grid = buildGrid();
    const scope = effectScope();
    scope.run(() => {
      const view = useSpatialGrid(grid);

      const fov1 = grid.beginFovUpdate();
      fov1.markVisible(0, 0);
      fov1.commit();

      const fov2 = grid.beginFovUpdate();
      // Commit with nothing staged — visible clears, explored keeps the bit.
      fov2.commit();

      expect(view.visibleCells.value).toEqual([]);
      expect(view.exploredCells.value).toEqual([{ x: 0, y: 0 }]);
    });
    scope.stop();
  });

  it('unsubscribes on scope dispose', () => {
    const grid = buildGrid();
    const scope = effectScope();
    let snapshot: readonly { x: number; y: number }[] = [];
    scope.run(() => {
      const view = useSpatialGrid(grid);
      const fov = grid.beginFovUpdate();
      fov.markVisible(0, 0);
      fov.commit();
      snapshot = view.visibleCells.value;
    });
    scope.stop();

    // Post-dispose mutation: should not throw, and the captured snapshot
    // reflects what we saw before tear-down.
    expect(snapshot).toEqual([{ x: 0, y: 0 }]);
    const fov = grid.beginFovUpdate();
    fov.markVisible(1, 1);
    fov.commit();
    expect(snapshot).toEqual([{ x: 0, y: 0 }]);
  });
});
