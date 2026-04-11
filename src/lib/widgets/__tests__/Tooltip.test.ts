import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Tooltip from '../Tooltip.vue';

describe('<Tooltip />', () => {
  it('renders the trigger slot content', () => {
    const wrapper = mount(Tooltip, {
      slots: {
        default: '<button data-testid="trigger">hover me</button>',
        content: '<span>tooltip body</span>',
      },
      attachTo: document.body,
    });
    expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="trigger"]').text()).toBe('hover me');
    wrapper.unmount();
  });

  it('accepts a disabled prop without error', () => {
    const wrapper = mount(Tooltip, {
      props: { disabled: true },
      slots: {
        default: '<button data-testid="trigger">x</button>',
        content: '<span>body</span>',
      },
      attachTo: document.body,
    });
    expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('forwards custom delay without error', () => {
    const wrapper = mount(Tooltip, {
      props: { delay: 100 },
      slots: {
        default: '<button data-testid="trigger">x</button>',
        content: '<span>body</span>',
      },
      attachTo: document.body,
    });
    expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('forwards side and sideOffset without error', () => {
    const wrapper = mount(Tooltip, {
      props: { side: 'right', sideOffset: 12 },
      slots: {
        default: '<button data-testid="trigger">x</button>',
        content: '<span>body</span>',
      },
      attachTo: document.body,
    });
    expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
