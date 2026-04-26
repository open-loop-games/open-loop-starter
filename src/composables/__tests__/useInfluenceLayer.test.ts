import { describe, it, expect } from 'vitest';
import { effectScope } from 'vue';
import { createSpatialGrid, createInfluenceLayer, linearFalloff } from 'open-loop-engine';
import { useInfluenceLayer } from '../useInfluenceLayer';

function buildLayer(width = 5, height = 5) {
  const grid = createSpatialGrid<number>({
    width,
    height,
    initializer: () => 0,
  });
  const layer = createInfluenceLayer(grid, {
    defaultRadius: 2,
    falloff: linearFalloff,
  });
  return { grid, layer };
}

describe('useInfluenceLayer', () => {
  it('at() returns current reader value', () => {
    const { layer } = buildLayer();
    const scope = effectScope();
    scope.run(() => {
      const view = useInfluenceLayer(layer);
      expect(view.at(2, 2).value).toBe(0);
      layer.addSource({ id: 'a', x: 2, y: 2, strength: 4 });
      layer.update();
      expect(view.at(2, 2).value).toBeCloseTo(4);
    });
    scope.stop();
  });

  it('at() returns 0 for out-of-bounds coordinates', () => {
    const { layer } = buildLayer();
    const scope = effectScope();
    scope.run(() => {
      const view = useInfluenceLayer(layer);
      expect(view.at(-1, 0).value).toBe(0);
      expect(view.at(99, 99).value).toBe(0);
    });
    scope.stop();
  });

  it('at() memoizes — same coords return the same ref', () => {
    const { layer } = buildLayer();
    const scope = effectScope();
    scope.run(() => {
      const view = useInfluenceLayer(layer);
      expect(view.at(2, 2)).toBe(view.at(2, 2));
      expect(view.at(2, 2)).not.toBe(view.at(3, 2));
    });
    scope.stop();
  });

  it('reactivity: refs update after layer.update() writes via grid.set', () => {
    const { layer } = buildLayer();
    const scope = effectScope();
    scope.run(() => {
      const view = useInfluenceLayer(layer);
      const cell = view.at(2, 2);
      expect(cell.value).toBe(0);
      layer.addSource({ id: 'a', x: 2, y: 2, strength: 6 });
      layer.update();
      expect(cell.value).toBeCloseTo(6);
    });
    scope.stop();
  });

  it('sum() updates reactively over a Chebyshev region', () => {
    const { layer } = buildLayer();
    const scope = effectScope();
    scope.run(() => {
      const view = useInfluenceLayer(layer);
      const totalRef = view.sum(2, 2, 2);
      expect(totalRef.value).toBe(0);
      layer.addSource({ id: 'a', x: 2, y: 2, strength: 4 });
      layer.update();
      expect(totalRef.value).toBeGreaterThan(0);
    });
    scope.stop();
  });

  it('peak() reports max-value cell, null when center OOB', () => {
    const { layer } = buildLayer();
    const scope = effectScope();
    scope.run(() => {
      const view = useInfluenceLayer(layer);
      layer.addSource({ id: 'a', x: 1, y: 1, strength: 5 });
      layer.update();
      const peak = view.peak(2, 2, 2);
      expect(peak.value).not.toBeNull();
      expect(peak.value!.x).toBe(1);
      expect(peak.value!.y).toBe(1);
      expect(peak.value!.value).toBeCloseTo(5);
      expect(view.peak(-5, -5, 1).value).toBeNull();
    });
    scope.stop();
  });

  it('reset() invalidates cached refs back to 0', () => {
    const { layer } = buildLayer();
    const scope = effectScope();
    scope.run(() => {
      const view = useInfluenceLayer(layer);
      layer.addSource({ id: 'a', x: 2, y: 2, strength: 8 });
      layer.update();
      const cell = view.at(2, 2);
      expect(cell.value).toBeCloseTo(8);
      layer.reset();
      expect(cell.value).toBe(0);
    });
    scope.stop();
  });

  it('disposes grid subscription on scope stop', () => {
    const { grid, layer } = buildLayer();
    const scope = effectScope();
    scope.run(() => {
      const view = useInfluenceLayer(layer);
      const cell = view.at(2, 2);
      expect(cell.value).toBe(0);
    });
    scope.stop();
    // After scope stop, mutating the grid should not throw or affect anything.
    grid.set(2, 2, 99);
    expect(grid.cells[2 * 5 + 2]).toBe(99);
  });
});
