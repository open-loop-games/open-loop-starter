import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SidebarMainShell from '../SidebarMainShell.vue';

describe('<SidebarMainShell />', () => {
  it('renders sidebar, sidebarResources, and default slots in correct containers', () => {
    const wrapper = mount(SidebarMainShell, {
      slots: {
        sidebar: '<nav data-testid="nav">nav</nav>',
        sidebarResources: '<div data-testid="res">resources</div>',
        default: '<main data-testid="main">main</main>',
      },
    });
    const sidebar = wrapper.find('.olui-sidebar-main__sidebar');
    const main = wrapper.find('.olui-sidebar-main__main');
    expect(sidebar.find('[data-testid="nav"]').exists()).toBe(true);
    expect(sidebar.find('[data-testid="res"]').exists()).toBe(true);
    expect(main.find('[data-testid="main"]').exists()).toBe(true);
    // main content must not leak into sidebar
    expect(sidebar.find('[data-testid="main"]').exists()).toBe(false);
  });

  it('sidebarResources renders above sidebar in DOM order', () => {
    const wrapper = mount(SidebarMainShell, {
      slots: {
        sidebar: '<div data-testid="nav">nav</div>',
        sidebarResources: '<div data-testid="res">res</div>',
      },
    });
    const html = wrapper.find('.olui-sidebar-main__sidebar').html();
    expect(html.indexOf('res')).toBeLessThan(html.indexOf('nav'));
  });

  it('applies default sidebarWidth', () => {
    const wrapper = mount(SidebarMainShell);
    const style = wrapper.element.getAttribute('style') ?? '';
    expect(style).toContain('--olui-sidebar-main-width: 240px');
  });

  it('applies custom sidebarWidth prop', () => {
    const wrapper = mount(SidebarMainShell, { props: { sidebarWidth: '20rem' } });
    const style = wrapper.element.getAttribute('style') ?? '';
    expect(style).toContain('--olui-sidebar-main-width: 20rem');
  });

  it('adds --collapsible modifier class when collapsible prop is true', () => {
    const wrapper = mount(SidebarMainShell, { props: { collapsible: true } });
    expect(wrapper.classes()).toContain('olui-sidebar-main--collapsible');
  });

  it('omits --collapsible modifier class by default', () => {
    const wrapper = mount(SidebarMainShell);
    expect(wrapper.classes()).not.toContain('olui-sidebar-main--collapsible');
  });
});
