import { describe, it, expect } from 'vitest';
import { effectScope } from 'vue';
import { createScopeStack, createSpatialGraph } from 'open-loop-engine';
import { useScopeStack } from '../useScopeStack';

interface Pkg {
  name: string;
}
interface Wire {
  kind: 'dep';
}

function buildStack() {
  const graph = createSpatialGraph<Pkg, Wire>();
  graph.addNode({ name: 'outer' }, { id: 'outer' });
  const inner = graph.createChildGraph('outer');
  inner.addNode({ name: 'deep' }, { id: 'deep' });
  inner.createChildGraph('deep');
  return { graph, stack: createScopeStack<Pkg, Wire>({ root: graph }) };
}

describe('useScopeStack', () => {
  it('path and depth track enter/exit', () => {
    const { stack } = buildStack();
    const scope = effectScope();
    scope.run(() => {
      const view = useScopeStack(stack);
      expect(view.path.value).toEqual([]);
      expect(view.depth.value).toBe(0);

      stack.enter('outer');
      expect(view.path.value).toEqual(['outer']);
      expect(view.depth.value).toBe(1);
      expect(view.currentNodeId.value).toBe('outer');

      stack.enter('deep');
      expect(view.path.value).toEqual(['outer', 'deep']);
      expect(view.depth.value).toBe(2);

      stack.exit();
      expect(view.path.value).toEqual(['outer']);
      expect(view.depth.value).toBe(1);
    });
    scope.stop();
  });

  it('current tracks the active graph', () => {
    const { graph, stack } = buildStack();
    const scope = effectScope();
    scope.run(() => {
      const view = useScopeStack(stack);
      expect(view.current.value).toBe(graph);
      stack.enter('outer');
      expect(view.current.value).toBe(graph.getChildGraph('outer'));
    });
    scope.stop();
  });

  it('breadcrumb resolves owning nodes root-to-leaf', () => {
    const { stack } = buildStack();
    const scope = effectScope();
    scope.run(() => {
      const view = useScopeStack(stack);
      expect(view.breadcrumb.value).toEqual([]);
      stack.enter('outer');
      stack.enter('deep');
      expect(view.breadcrumb.value.map((n) => n.id)).toEqual(['outer', 'deep']);
    });
    scope.stop();
  });

  it('stateAt returns the last cached recalculate label', () => {
    const graph = createSpatialGraph<Pkg, Wire>();
    graph.addNode({ name: 'outer' }, { id: 'outer' });
    graph.createChildGraph('outer');
    const stack = createScopeStack<Pkg, Wire>({
      root: graph,
      recalculate: (g) => (g.nodes.size > 0 ? 'stable' : 'pristine'),
    });

    const scope = effectScope();
    scope.run(() => {
      const view = useScopeStack(stack);
      const label = view.stateAt([]);
      expect(label.value).toBeUndefined();
      stack.enter('outer');
      stack.recalculateAt([]);
      expect(label.value).toBe('stable');
    });
    scope.stop();
  });

  it('unsubscribes on scope dispose', () => {
    const { stack } = buildStack();
    const scope = effectScope();
    let depthAtTeardown = -1;
    scope.run(() => {
      const view = useScopeStack(stack);
      stack.enter('outer');
      depthAtTeardown = view.depth.value;
    });
    scope.stop();

    expect(depthAtTeardown).toBe(1);
    stack.enter('deep');
    // No crash; inner listener was detached.
    expect(stack.depth).toBe(2);
  });
});
