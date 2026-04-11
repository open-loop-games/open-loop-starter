import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, inject, nextTick } from 'vue';
import AppFrame from '../AppFrame.vue';
import { modalStackKey } from '../../modal';

const TestModal = defineComponent({
  name: 'TestModal',
  render: () => h('div', { 'data-testid': 'test-modal' }, 'modal-content'),
});

describe('<AppFrame />', () => {
  it('renders the default slot (shell goes here)', () => {
    const wrapper = mount(AppFrame, {
      slots: { default: '<div data-testid="shell">shell</div>' },
    });
    expect(wrapper.find('[data-testid="shell"]').exists()).toBe(true);
  });

  it('renders the header slot when provided', () => {
    const wrapper = mount(AppFrame, {
      slots: { header: '<div data-testid="header-content">header</div>' },
    });
    expect(wrapper.find('[data-testid="header-content"]').exists()).toBe(true);
    expect(wrapper.find('header.olui-app-frame__header').exists()).toBe(true);
  });

  it('omits header element when no header slot is provided', () => {
    const wrapper = mount(AppFrame);
    expect(wrapper.find('header.olui-app-frame__header').exists()).toBe(false);
  });

  it('renders the toasts slot when provided', () => {
    const wrapper = mount(AppFrame, {
      slots: { toasts: '<div data-testid="toast">toast</div>' },
    });
    expect(wrapper.find('[data-testid="toast"]').exists()).toBe(true);
  });

  it('writes data-theme attribute from prop', async () => {
    const wrapper = mount(AppFrame, { props: { theme: 'light' } });
    const frame = wrapper.find('.olui-app-frame').element;
    expect(frame.getAttribute('data-theme')).toBe('light');
    await wrapper.setProps({ theme: 'dark' });
    expect(wrapper.find('.olui-app-frame').element.getAttribute('data-theme')).toBe('dark');
  });

  it('leaves data-theme unset when prop is omitted', () => {
    const wrapper = mount(AppFrame);
    expect(wrapper.find('.olui-app-frame').element.hasAttribute('data-theme')).toBe(false);
  });

  it('provides modalStackKey so descendants can push modals', async () => {
    const Pusher = defineComponent({
      setup() {
        const stack = inject(modalStackKey);
        if (!stack) throw new Error('modal stack not provided');
        stack.push(TestModal);
        return () => h('div', 'pusher');
      },
    });
    const wrapper = mount(AppFrame, {
      slots: { default: () => h(Pusher) },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    expect(document.querySelector('[data-testid="test-modal"]')).not.toBeNull();
    wrapper.unmount();
  });
});
