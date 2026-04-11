import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ThreePanelShell from '../ThreePanelShell.vue';

describe('<ThreePanelShell />', () => {
  it('renders left, default, and right slots in correct containers', () => {
    const wrapper = mount(ThreePanelShell, {
      slots: {
        left: '<div data-testid="left">L</div>',
        default: '<div data-testid="main">M</div>',
        right: '<div data-testid="right">R</div>',
      },
    });
    expect(wrapper.find('.olui-three-panel__left [data-testid="left"]').exists()).toBe(true);
    expect(wrapper.find('.olui-three-panel__main [data-testid="main"]').exists()).toBe(true);
    expect(wrapper.find('.olui-three-panel__right [data-testid="right"]').exists()).toBe(true);
  });

  it('applies default leftWidth and rightWidth', () => {
    const wrapper = mount(ThreePanelShell);
    const style = wrapper.element.getAttribute('style') ?? '';
    expect(style).toContain('--three-panel-left-width: 200px');
    expect(style).toContain('--three-panel-right-width: 280px');
  });

  it('applies custom widths', () => {
    const wrapper = mount(ThreePanelShell, {
      props: { leftWidth: '15rem', rightWidth: '18rem' },
    });
    const style = wrapper.element.getAttribute('style') ?? '';
    expect(style).toContain('--three-panel-left-width: 15rem');
    expect(style).toContain('--three-panel-right-width: 18rem');
  });
});
