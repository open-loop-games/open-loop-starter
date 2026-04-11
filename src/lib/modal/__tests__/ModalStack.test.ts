import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import ModalStack from '../ModalStack.vue';
import { useModalStack, modalStackKey } from '../useModalStack';

const Panel = (label: string) =>
  defineComponent({
    name: `Panel-${label}`,
    render: () => h('div', { 'data-testid': `panel-${label}` }, label),
  });

const PanelA = Panel('A');
const PanelB = Panel('B');

function mountWithProvider() {
  const api = useModalStack();
  const Host = defineComponent({
    setup() {
      return () => h(ModalStack);
    },
  });
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: { provide: { [modalStackKey as symbol]: api } },
  });
  return { wrapper, api };
}

const findPanel = (label: string) => document.querySelector(`[data-testid="panel-${label}"]`);

describe('<ModalStack />', () => {
  it('renders nothing when stack is empty', async () => {
    const { wrapper } = mountWithProvider();
    await nextTick();
    expect(findPanel('A')).toBeNull();
    wrapper.unmount();
  });

  it('renders pushed entries inside a DialogContent', async () => {
    const { wrapper, api } = mountWithProvider();
    api.push(PanelA);
    await nextTick();
    await nextTick();
    expect(findPanel('A')).not.toBeNull();
    wrapper.unmount();
  });

  it('renders multiple entries when stack grows', async () => {
    const { wrapper, api } = mountWithProvider();
    api.push(PanelA);
    api.push(PanelB);
    await nextTick();
    await nextTick();
    expect(findPanel('A')).not.toBeNull();
    expect(findPanel('B')).not.toBeNull();
    wrapper.unmount();
  });

  it('pop removes the top entry from DOM', async () => {
    const { wrapper, api } = mountWithProvider();
    api.push(PanelA);
    api.push(PanelB);
    await nextTick();
    await nextTick();
    api.pop();
    await nextTick();
    await nextTick();
    expect(findPanel('A')).not.toBeNull();
    // reka-ui may keep the node briefly with data-state="closed"
    const bEl = findPanel('B');
    if (bEl) {
      expect(bEl.closest('[data-state]')?.getAttribute('data-state')).toBe('closed');
    }
    wrapper.unmount();
  });

  it('clear empties the rendered stack', async () => {
    const { wrapper, api } = mountWithProvider();
    api.push(PanelA);
    api.push(PanelB);
    await nextTick();
    await nextTick();
    api.clear();
    await nextTick();
    await nextTick();
    // Either removed or marked closed.
    for (const label of ['A', 'B']) {
      const el = findPanel(label);
      if (el) {
        expect(el.closest('[data-state]')?.getAttribute('data-state')).toBe('closed');
      }
    }
    wrapper.unmount();
  });

  it('works with the `stack` prop instead of provide/inject', async () => {
    const api = useModalStack();
    const wrapper = mount(ModalStack, {
      attachTo: document.body,
      props: { stack: api },
    });
    api.push(PanelA);
    await nextTick();
    await nextTick();
    expect(findPanel('A')).not.toBeNull();
    wrapper.unmount();
  });
});
