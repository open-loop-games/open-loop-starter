import { computed, onScopeDispose, shallowRef, triggerRef, type ComputedRef } from 'vue';
import type { InfluenceLayer } from '@open-loop/engine';

export interface UseInfluenceLayerReturn {
  at: (x: number, y: number) => ComputedRef<number>;
  sum: (x: number, y: number, radius: number) => ComputedRef<number>;
  peak: (
    x: number,
    y: number,
    radius: number,
  ) => ComputedRef<{ x: number; y: number; value: number } | null>;
}

/**
 * Vue reactive view over an {@link InfluenceLayer}'s reader. The layer
 * writes through `grid.set()` during `update()` and `reset()`, so
 * subscribing to the grid's `cellChanged` event gives one signal per
 * write. This composable bumps a single shallow ref per event; Vue
 * batches dependent computeds to the next tick, so the per-cell write
 * storm of large bulk passes flushes as a single recompute downstream.
 *
 * Memoizes refs per query shape: repeat calls with the same arguments
 * return the same `ComputedRef`. Caches and event subscriptions clear on
 * scope dispose — do not retain returned refs beyond the consuming
 * component's lifetime.
 */
export function useInfluenceLayer(layer: InfluenceLayer): UseInfluenceLayerReturn {
  const version = shallowRef(0);
  const reader = layer.read();

  const off = layer.grid.on('cellChanged', () => {
    version.value++;
    triggerRef(version);
  });

  const atCache = new Map<string, ComputedRef<number>>();
  const sumCache = new Map<string, ComputedRef<number>>();
  const peakCache = new Map<string, ComputedRef<{ x: number; y: number; value: number } | null>>();

  onScopeDispose(() => {
    off();
    atCache.clear();
    sumCache.clear();
    peakCache.clear();
  });

  function at(x: number, y: number): ComputedRef<number> {
    const key = `${x},${y}`;
    const existing = atCache.get(key);
    if (existing) return existing;
    const ref = computed(() => {
      void version.value;
      return reader.at(x, y);
    });
    atCache.set(key, ref);
    return ref;
  }

  function sum(x: number, y: number, radius: number): ComputedRef<number> {
    const key = `${x},${y},${radius}`;
    const existing = sumCache.get(key);
    if (existing) return existing;
    const ref = computed(() => {
      void version.value;
      return reader.sum(x, y, radius);
    });
    sumCache.set(key, ref);
    return ref;
  }

  function peak(
    x: number,
    y: number,
    radius: number,
  ): ComputedRef<{ x: number; y: number; value: number } | null> {
    const key = `${x},${y},${radius}`;
    const existing = peakCache.get(key);
    if (existing) return existing;
    const ref = computed(() => {
      void version.value;
      return reader.peak(x, y, radius);
    });
    peakCache.set(key, ref);
    return ref;
  }

  return { at, sum, peak };
}
