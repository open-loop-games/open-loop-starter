import { describe, it, expect } from 'vitest';
import { effectScope } from 'vue';
import { createSpatialGraph } from 'open-loop-engine';
import { useSpatialGraph } from '../useSpatialGraph';

interface Pkg {
  name: string;
}
interface Wire {
  kind: 'dep' | 'sibling';
}

describe('useSpatialGraph', () => {
  it('nodes aggregate reacts to addNode / removeNode', () => {
    const graph = createSpatialGraph<Pkg, Wire>();
    const scope = effectScope();
    scope.run(() => {
      const view = useSpatialGraph(graph);
      expect(view.nodes.value).toEqual([]);
      const a = graph.addNode({ name: 'a' }, { id: 'a' });
      expect(view.nodes.value).toHaveLength(1);
      expect(view.nodes.value[0]).toBe(a);
      graph.removeNode('a');
      expect(view.nodes.value).toEqual([]);
    });
    scope.stop();
  });

  it('edges aggregate reacts to addEdge / removeEdge', () => {
    const graph = createSpatialGraph<Pkg, Wire>();
    graph.addNode({ name: 'a' }, { id: 'a' });
    graph.addNode({ name: 'b' }, { id: 'b' });
    const scope = effectScope();
    scope.run(() => {
      const view = useSpatialGraph(graph);
      expect(view.edges.value).toEqual([]);
      const edge = graph.addEdge('a', 'b', { kind: 'dep' }, { id: 'e1' });
      expect(view.edges.value).toEqual([edge]);
      graph.removeEdge('e1');
      expect(view.edges.value).toEqual([]);
    });
    scope.stop();
  });

  it('node(id) returns undefined for missing ids and resolves once added', () => {
    const graph = createSpatialGraph<Pkg, Wire>();
    const scope = effectScope();
    scope.run(() => {
      const view = useSpatialGraph(graph);
      const nodeRef = view.node('a');
      expect(nodeRef.value).toBeUndefined();
      graph.addNode({ name: 'a' }, { id: 'a' });
      expect(nodeRef.value?.data.name).toBe('a');
      graph.removeNode('a');
      expect(nodeRef.value).toBeUndefined();
    });
    scope.stop();
  });

  it('node(id) memoizes — same id returns the same ref', () => {
    const graph = createSpatialGraph<Pkg, Wire>();
    const scope = effectScope();
    scope.run(() => {
      const view = useSpatialGraph(graph);
      expect(view.node('a')).toBe(view.node('a'));
      expect(view.node('a')).not.toBe(view.node('b'));
    });
    scope.stop();
  });

  it('neighbors(id) reacts to edge changes', () => {
    const graph = createSpatialGraph<Pkg, Wire>();
    graph.addNode({ name: 'a' }, { id: 'a' });
    graph.addNode({ name: 'b' }, { id: 'b' });
    graph.addNode({ name: 'c' }, { id: 'c' });
    const scope = effectScope();
    scope.run(() => {
      const view = useSpatialGraph(graph);
      const neighbors = view.neighbors('a');
      expect(neighbors.value).toEqual([]);
      graph.addEdge('a', 'b', { kind: 'dep' }, { id: 'ab' });
      expect(neighbors.value.map((n) => n.id)).toEqual(['b']);
      graph.addEdge('a', 'c', { kind: 'dep' }, { id: 'ac' });
      expect(neighbors.value.map((n) => n.id).sort()).toEqual(['b', 'c']);
      graph.removeEdge('ab');
      expect(neighbors.value.map((n) => n.id)).toEqual(['c']);
    });
    scope.stop();
  });

  it('neighbors(id) returns [] for missing nodes without throwing', () => {
    const graph = createSpatialGraph<Pkg, Wire>();
    const scope = effectScope();
    scope.run(() => {
      const view = useSpatialGraph(graph);
      expect(view.neighbors('missing').value).toEqual([]);
    });
    scope.stop();
  });

  it('unsubscribes on scope dispose', () => {
    const graph = createSpatialGraph<Pkg, Wire>();
    const scope = effectScope();
    let capturedLen = -1;
    scope.run(() => {
      const view = useSpatialGraph(graph);
      graph.addNode({ name: 'a' }, { id: 'a' });
      capturedLen = view.nodes.value.length;
    });
    scope.stop();

    expect(capturedLen).toBe(1);
    graph.addNode({ name: 'b' }, { id: 'b' });
    // No crash; the composable's handlers were torn down.
    expect(graph.nodes.size).toBe(2);
  });
});
