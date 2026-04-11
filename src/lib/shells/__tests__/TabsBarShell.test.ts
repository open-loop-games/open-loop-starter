import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TabsBarShell from '../TabsBarShell.vue';

describe('<TabsBarShell />', () => {
  it('renders resources, tabs, and default slots in correct containers', () => {
    const wrapper = mount(TabsBarShell, {
      slots: {
        resources: '<div data-testid="res">res</div>',
        tabs: '<div data-testid="tabs">tabs</div>',
        default: '<div data-testid="main">main</div>',
      },
    });
    expect(wrapper.find('.olui-tabs-bar__resources [data-testid="res"]').exists()).toBe(true);
    expect(wrapper.find('.olui-tabs-bar__tabs [data-testid="tabs"]').exists()).toBe(true);
    expect(wrapper.find('.olui-tabs-bar__main [data-testid="main"]').exists()).toBe(true);
  });

  it('defaults navPosition to top', () => {
    const wrapper = mount(TabsBarShell);
    expect(wrapper.element.getAttribute('data-nav-position')).toBe('top');
  });

  it('applies navPosition=bottom', () => {
    const wrapper = mount(TabsBarShell, { props: { navPosition: 'bottom' } });
    expect(wrapper.element.getAttribute('data-nav-position')).toBe('bottom');
  });

  it('omits resources container when slot unused', () => {
    const wrapper = mount(TabsBarShell, {
      slots: { tabs: '<div>tabs</div>' },
    });
    expect(wrapper.find('.olui-tabs-bar__resources').exists()).toBe(false);
  });
});
