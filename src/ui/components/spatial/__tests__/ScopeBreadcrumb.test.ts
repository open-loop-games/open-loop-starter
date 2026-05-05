import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { h, nextTick } from 'vue';
import {
  createScopeStack,
  createSpatialGraph,
  type ScopeStack,
  type SpatialGraph,
} from 'open-loop-engine';
import ScopeBreadcrumb from '../ScopeBreadcrumb.vue';

interface Pkg {
  name: string;
}
interface Wire {
  kind: 'dep';
}

function build(): { graph: SpatialGraph<Pkg, Wire>; stack: ScopeStack<Pkg, Wire> } {
  const graph = createSpatialGraph<Pkg, Wire>();
  graph.addNode({ name: 'outer' }, { id: 'outer' });
  const inner = graph.createChildGraph('outer');
  inner.addNode({ name: 'deep' }, { id: 'deep' });
  inner.createChildGraph('deep');
  const stack = createScopeStack<Pkg, Wire>({
    root: graph,
    recalculate: (g) => (g.nodes.size > 0 ? 'stable' : 'pristine'),
  });
  return { graph, stack };
}

describe('ScopeBreadcrumb', () => {
  it('renders nothing (no trail, no back button) at depth 0', () => {
    const { stack } = build();
    const wrapper = mount(ScopeBreadcrumb, { props: { stack } });

    expect(wrapper.find('.scope-breadcrumb__trail').exists()).toBe(false);
    expect(wrapper.find('.scope-breadcrumb__back').exists()).toBe(false);

    wrapper.unmount();
  });

  it('renders one crumb per entered level, last one current and disabled', async () => {
    const { stack } = build();
    stack.enter('outer');
    stack.enter('deep');

    const wrapper = mount(ScopeBreadcrumb, { props: { stack } });
    await nextTick();

    const items = wrapper.findAll('[data-crumb-depth]');
    expect(items).toHaveLength(2);
    expect(items[0].attributes('data-crumb-depth')).toBe('1');
    expect(items[1].attributes('data-crumb-depth')).toBe('2');
    expect(items[1].attributes('data-crumb-current')).toBe('true');

    const buttons = wrapper.findAll('.scope-breadcrumb__crumb');
    expect(buttons[0].attributes('disabled')).toBeUndefined();
    expect(buttons[1].attributes('disabled')).toBeDefined();
    expect(buttons[1].classes()).toContain('scope-breadcrumb__crumb--current');

    wrapper.unmount();
  });

  it('clicking a crumb exits down to that depth', async () => {
    const { stack } = build();
    stack.enter('outer');
    stack.enter('deep');

    const wrapper = mount(ScopeBreadcrumb, { props: { stack } });
    await nextTick();

    const outerCrumb = wrapper.find('[data-crumb-depth="1"] .scope-breadcrumb__crumb');
    await outerCrumb.trigger('pointerdown');

    expect(stack.depth).toBe(1);
    expect(stack.path).toEqual(['outer']);

    wrapper.unmount();
  });

  it('clicking the synthetic root crumb calls exitToRoot', async () => {
    const { stack } = build();
    stack.enter('outer');
    stack.enter('deep');

    const wrapper = mount(ScopeBreadcrumb, {
      props: { stack, rootLabel: 'Home' },
    });
    await nextTick();

    const rootCrumb = wrapper.find('[data-crumb-depth="0"] .scope-breadcrumb__crumb');
    expect(rootCrumb.text()).toBe('Home');
    await rootCrumb.trigger('pointerdown');

    expect(stack.depth).toBe(0);

    wrapper.unmount();
  });

  it('omits the synthetic root when rootLabel is not provided', async () => {
    const { stack } = build();
    stack.enter('outer');

    const wrapper = mount(ScopeBreadcrumb, { props: { stack } });
    await nextTick();

    expect(wrapper.find('[data-crumb-depth="0"]').exists()).toBe(false);

    wrapper.unmount();
  });

  it('back button click calls stack.exit once', async () => {
    const { stack } = build();
    stack.enter('outer');
    stack.enter('deep');

    const wrapper = mount(ScopeBreadcrumb, { props: { stack } });
    await nextTick();

    await wrapper.find('.scope-breadcrumb__back').trigger('pointerdown');
    expect(stack.depth).toBe(1);

    wrapper.unmount();
  });

  it('hides back button when showBackButton is false', async () => {
    const { stack } = build();
    stack.enter('outer');

    const wrapper = mount(ScopeBreadcrumb, {
      props: { stack, showBackButton: false },
    });
    await nextTick();

    expect(wrapper.find('.scope-breadcrumb__back').exists()).toBe(false);

    wrapper.unmount();
  });

  it('escape key pops one level', async () => {
    const { stack } = build();
    stack.enter('outer');
    stack.enter('deep');

    const wrapper = mount(ScopeBreadcrumb, { props: { stack } });
    await nextTick();

    await wrapper.find('.scope-breadcrumb').trigger('keydown', { key: 'Escape' });
    expect(stack.depth).toBe(1);

    wrapper.unmount();
  });

  it('escape key is ignored when enableEscape is false', async () => {
    const { stack } = build();
    stack.enter('outer');

    const wrapper = mount(ScopeBreadcrumb, {
      props: { stack, enableEscape: false },
    });
    await nextTick();

    await wrapper.find('.scope-breadcrumb').trigger('keydown', { key: 'Escape' });
    expect(stack.depth).toBe(1);

    wrapper.unmount();
  });

  it('reacts to external stack.enter after mount', async () => {
    const { stack } = build();

    const wrapper = mount(ScopeBreadcrumb, { props: { stack } });
    expect(wrapper.findAll('[data-crumb-depth]')).toHaveLength(0);

    stack.enter('outer');
    await nextTick();

    expect(wrapper.findAll('[data-crumb-depth]')).toHaveLength(1);

    wrapper.unmount();
  });

  it('scoped crumb slot receives node, depth, isCurrent, and state', async () => {
    const { stack } = build();
    stack.enter('outer');
    stack.recalculateAt(['outer']);

    const wrapper = mount(ScopeBreadcrumb, {
      props: { stack },
      slots: {
        crumb: (slotProps) =>
          h(
            'span',
            {
              class: 'custom-crumb',
              'data-depth': String(slotProps.depth),
              'data-current': String(slotProps.isCurrent),
              'data-state': slotProps.state ?? 'none',
            },
            (slotProps.node.data as Pkg).name,
          ),
      },
    });
    await nextTick();

    const custom = wrapper.find('.custom-crumb');
    expect(custom.text()).toBe('outer');
    expect(custom.attributes('data-depth')).toBe('1');
    expect(custom.attributes('data-current')).toBe('true');
    expect(custom.attributes('data-state')).toBe('stable');

    wrapper.unmount();
  });

  it('compact variant applies the modifier class', async () => {
    const { stack } = build();
    stack.enter('outer');
    stack.enter('deep');

    const wrapper = mount(ScopeBreadcrumb, {
      props: { stack, variant: 'compact' },
    });
    await nextTick();

    expect(wrapper.find('.scope-breadcrumb').classes()).toContain('scope-breadcrumb--compact');

    wrapper.unmount();
  });

  it('state slot prop updates after recalculateAt fires', async () => {
    const { stack } = build();
    stack.enter('outer');

    const wrapper = mount(ScopeBreadcrumb, {
      props: { stack },
      slots: {
        crumb: (slotProps) =>
          h('span', { class: 'custom-crumb', 'data-state': slotProps.state ?? 'none' }),
      },
    });
    await nextTick();

    expect(wrapper.find('.custom-crumb').attributes('data-state')).toBe('none');

    stack.recalculateAt(['outer']);
    await nextTick();

    expect(wrapper.find('.custom-crumb').attributes('data-state')).toBe('stable');

    wrapper.unmount();
  });
});
