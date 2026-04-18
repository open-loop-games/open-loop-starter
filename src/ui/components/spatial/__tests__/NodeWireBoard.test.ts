import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import { createSpatialGraph, type SpatialGraph } from 'open-loop-engine';
import NodeWireBoard from '../NodeWireBoard.vue';

interface Node {
  name: string;
}
interface Edge {
  kind: string;
}

function seed(): { graph: SpatialGraph<Node, Edge>; positions: Map<string, { x: number; y: number }> } {
  const graph = createSpatialGraph<Node, Edge>();
  graph.addNode({ name: 'a' }, { id: 'a' });
  graph.addNode({ name: 'b' }, { id: 'b' });
  graph.addNode({ name: 'c' }, { id: 'c' });
  graph.addEdge('a', 'b', { kind: 'dep' }, { id: 'ab' });
  graph.addEdge('b', 'c', { kind: 'dep' }, { id: 'bc' });
  const positions = new Map([
    ['a', { x: 0, y: 0 }],
    ['b', { x: 100, y: 0 }],
    ['c', { x: 200, y: 0 }],
  ]);
  return { graph, positions };
}

describe('NodeWireBoard', () => {
  it('renders one <g> per node and default <line> per edge', () => {
    const { graph, positions } = seed();
    const wrapper = mount(NodeWireBoard, { props: { graph, positions } });

    expect(wrapper.findAll('[data-node-id]')).toHaveLength(3);
    expect(wrapper.findAll('[data-edge-id]')).toHaveLength(2);
    expect(wrapper.findAll('line.node-wire-board-edge-default')).toHaveLength(2);

    wrapper.unmount();
  });

  it('applies node position as SVG translate', () => {
    const { graph, positions } = seed();
    const wrapper = mount(NodeWireBoard, { props: { graph, positions } });

    const nodeB = wrapper.find('[data-node-id="b"]');
    expect(nodeB.attributes('transform')).toBe('translate(100, 0)');

    wrapper.unmount();
  });

  it('reacts when edges are added after mount', async () => {
    const { graph, positions } = seed();
    const wrapper = mount(NodeWireBoard, { props: { graph, positions } });

    expect(wrapper.findAll('[data-edge-id]')).toHaveLength(2);

    graph.addEdge('a', 'c', { kind: 'dep' }, { id: 'ac' });
    await nextTick();

    expect(wrapper.findAll('[data-edge-id]')).toHaveLength(3);
    expect(wrapper.find('[data-edge-id="ac"]').exists()).toBe(true);

    wrapper.unmount();
  });

  it('reacts when a node is removed (drops node and attached edges)', async () => {
    const { graph, positions } = seed();
    const wrapper = mount(NodeWireBoard, { props: { graph, positions } });

    graph.removeNode('b');
    await nextTick();

    expect(wrapper.findAll('[data-node-id]')).toHaveLength(2);
    expect(wrapper.find('[data-node-id="b"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-edge-id]')).toHaveLength(0);

    wrapper.unmount();
  });

  it('uses a custom edge routing callback via <path d>', () => {
    const { graph, positions } = seed();
    const orthogonal = (from: { x: number; y: number }, to: { x: number; y: number }) =>
      `M ${from.x} ${from.y} L ${from.x} ${to.y} L ${to.x} ${to.y}`;

    const wrapper = mount(NodeWireBoard, {
      props: { graph, positions, edgeRouting: orthogonal },
    });

    const paths = wrapper.findAll('path.node-wire-board-edge-default');
    expect(paths).toHaveLength(2);
    expect(paths[0].attributes('d')).toBe('M 0 0 L 0 0 L 100 0');
    expect(wrapper.findAll('line.node-wire-board-edge-default')).toHaveLength(0);

    wrapper.unmount();
  });

  it('emits connect-request when editable and drag ends on a different node', async () => {
    const { graph, positions } = seed();
    const wrapper = mount(NodeWireBoard, { props: { graph, positions, editable: true } });

    await wrapper.find('[data-node-id="a"]').trigger('pointerdown', { pointerId: 1 });
    await wrapper.find('[data-node-id="c"]').trigger('pointerup', { pointerId: 1 });

    expect(wrapper.emitted('connect-request')).toEqual([['a', 'c']]);

    wrapper.unmount();
  });

  it('does not emit connect-request when editable is false', async () => {
    const { graph, positions } = seed();
    const wrapper = mount(NodeWireBoard, { props: { graph, positions, editable: false } });

    await wrapper.find('[data-node-id="a"]').trigger('pointerdown', { pointerId: 1 });
    await wrapper.find('[data-node-id="c"]').trigger('pointerup', { pointerId: 1 });

    expect(wrapper.emitted('connect-request')).toBeUndefined();

    wrapper.unmount();
  });

  it('does not emit when drag ends on the same node', async () => {
    const { graph, positions } = seed();
    const wrapper = mount(NodeWireBoard, { props: { graph, positions, editable: true } });

    await wrapper.find('[data-node-id="a"]').trigger('pointerdown', { pointerId: 1 });
    await wrapper.find('[data-node-id="a"]').trigger('pointerup', { pointerId: 1 });

    expect(wrapper.emitted('connect-request')).toBeUndefined();

    wrapper.unmount();
  });

  it('emits node-click on click', async () => {
    const { graph, positions } = seed();
    const wrapper = mount(NodeWireBoard, { props: { graph, positions } });

    await wrapper.find('[data-node-id="b"]').trigger('click');

    expect(wrapper.emitted('node-click')).toEqual([['b']]);

    wrapper.unmount();
  });

  it('applies explicit viewBox prop', () => {
    const { graph, positions } = seed();
    const wrapper = mount(NodeWireBoard, {
      props: { graph, positions, viewBox: { x: -50, y: -25, width: 400, height: 200 } },
    });

    expect(wrapper.find('svg').attributes('viewBox')).toBe('-50 -25 400 200');

    wrapper.unmount();
  });

  it('renders a custom node slot with typed payload', () => {
    const { graph, positions } = seed();
    const wrapper = mount(NodeWireBoard, {
      props: { graph, positions, selectedId: 'b' },
      slots: {
        node: (slotProps) =>
          h(
            'text',
            { class: 'custom-node', 'data-sel': String(slotProps.selected) },
            (slotProps.node.data as Node).name,
          ),
      },
    });

    const labels = wrapper.findAll('text.custom-node');
    expect(labels).toHaveLength(3);
    expect(labels.map((l) => l.text()).sort()).toEqual(['a', 'b', 'c']);

    const selectedLabel = labels.find((l) => l.text() === 'b');
    expect(selectedLabel?.attributes('data-sel')).toBe('true');

    wrapper.unmount();
  });

  it('applies selected class when selectedId matches', () => {
    const { graph, positions } = seed();
    const wrapper = mount(NodeWireBoard, {
      props: { graph, positions, selectedId: 'a' },
    });

    expect(wrapper.find('[data-node-id="a"]').classes()).toContain('selected');
    expect(wrapper.find('[data-node-id="b"]').classes()).not.toContain('selected');

    wrapper.unmount();
  });

  it('recomputes viewBox when positions prop is replaced', async () => {
    const { graph } = seed();
    const wrapper = mount(NodeWireBoard, {
      props: {
        graph,
        positions: new Map([
          ['a', { x: 0, y: 0 }],
          ['b', { x: 10, y: 10 }],
          ['c', { x: 20, y: 20 }],
        ]),
      },
    });

    const first = wrapper.find('svg').attributes('viewBox');

    await wrapper.setProps({
      positions: new Map([
        ['a', { x: 0, y: 0 }],
        ['b', { x: 500, y: 500 }],
        ['c', { x: 1000, y: 1000 }],
      ]),
    });

    const second = wrapper.find('svg').attributes('viewBox');
    expect(second).not.toBe(first);

    wrapper.unmount();
  });
});
