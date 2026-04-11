import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Popover from '../Popover.vue';

describe('<Popover />', () => {
  it('renders the trigger slot', () => {
    const wrapper = mount(Popover, {
      slots: {
        trigger: '<button data-testid="trigger">open</button>',
        default: '<span>body</span>',
      },
      attachTo: document.body,
    });
    expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="trigger"]').text()).toBe('open');
    wrapper.unmount();
  });

  it('forwards modal, side, align, sideOffset without error', () => {
    const wrapper = mount(Popover, {
      props: {
        modal: true,
        side: 'right',
        align: 'start',
        sideOffset: 10,
      },
      slots: {
        trigger: '<button data-testid="trigger">x</button>',
        default: '<span>body</span>',
      },
      attachTo: document.body,
    });
    expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('accepts showArrow and showClose toggles', () => {
    const wrapper = mount(Popover, {
      props: { showArrow: false, showClose: true },
      slots: {
        trigger: '<button data-testid="trigger">x</button>',
        default: '<span>body</span>',
      },
      attachTo: document.body,
    });
    expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
