import { computed, onScopeDispose, shallowRef, triggerRef, type ComputedRef } from 'vue';
import type { GridCoord, SpatialGrid } from 'open-loop-engine';

export interface UseSpatialGridReturn<T> {
  cell: (x: number, y: number) => ComputedRef<T | undefined>;
  visibleCells: ComputedRef<readonly GridCoord[]>;
  exploredCells: ComputedRef<readonly GridCoord[]>;
}

/**
 * Vue reactive view over a plain-data {@link SpatialGrid}. The grid remains
 * authoritative; this composable subscribes to its events and exposes
 * computed refs that invalidate when the underlying state changes.
 *
 * `cell(x, y)` memoizes a ref per coordinate so repeat calls with the same
 * coordinate return the same ref. Per-cell refs are cleared on scope
 * dispose; do not retain returned refs beyond the consuming component's
 * lifetime.
 */
export function useSpatialGrid<T>(grid: SpatialGrid<T>): UseSpatialGridReturn<T> {
  const cellVersion = shallowRef(0);
  const maskVersion = shallowRef(0);

  const cellCache = new Map<string, ComputedRef<T | undefined>>();

  const off: Array<() => void> = [
    grid.on('cellChanged', () => {
      cellVersion.value++;
      triggerRef(cellVersion);
    }),
    grid.on('fovUpdated', () => {
      maskVersion.value++;
      triggerRef(maskVersion);
    }),
    grid.on('maskChanged', () => {
      maskVersion.value++;
      triggerRef(maskVersion);
    }),
  ];

  onScopeDispose(() => {
    for (const fn of off) fn();
    cellCache.clear();
  });

  function cell(x: number, y: number): ComputedRef<T | undefined> {
    const key = `${x},${y}`;
    const existing = cellCache.get(key);
    if (existing) return existing;
    const ref = computed(() => {
      void cellVersion.value;
      return grid.tryAt(x, y);
    });
    cellCache.set(key, ref);
    return ref;
  }

  const visibleCells = computed<readonly GridCoord[]>(() => {
    void maskVersion.value;
    const out: GridCoord[] = [];
    const { width, height, visible } = grid;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (visible[y * width + x] === 1) out.push({ x, y });
      }
    }
    return out;
  });

  const exploredCells = computed<readonly GridCoord[]>(() => {
    void maskVersion.value;
    const out: GridCoord[] = [];
    const { width, height, explored } = grid;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (explored[y * width + x] === 1) out.push({ x, y });
      }
    }
    return out;
  });

  return { cell, visibleCells, exploredCells };
}
