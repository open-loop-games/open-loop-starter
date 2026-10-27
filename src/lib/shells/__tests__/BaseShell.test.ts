import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { h } from 'vue';
import BaseShell from '../BaseShell.vue';

const text = (s: string) => () => h('p', s);

describe('BaseShell', () => {
  it('renders main, and only the regions whose slot is filled', () => {
    const w = mount(BaseShell, {
      slots: { default: text('main'), topBar: text('top'), sideBarRight: text('right') },
    });
    expect(w.find('.olui-shell__main').text()).toBe('main');
    expect(w.find('.olui-shell__top-bar').text()).toBe('top');
    expect(w.find('.olui-shell__side-bar-right').text()).toBe('right');
    expect(w.find('.olui-shell__side-bar-left').exists()).toBe(false);
    expect(w.find('.olui-shell__bottom-bar').exists()).toBe(false);
  });

  it('puts a filled rail beside main as a grid track, and leaves an unfilled one out', () => {
    const w = mount(BaseShell, {
      props: { sideBarLeftWidth: '200px', mainMinWidth: '480px' },
      slots: { default: text('main'), sideBarLeft: text('left') },
    });
    const style = w.find('.olui-shell').attributes('style');
    expect(style).toContain('--_shell-columns: 200px minmax(480px, 1fr)');
  });

  describe('viewport', () => {
    const viewportOf = (w: ReturnType<typeof mount>) =>
      w.find('.olui-shell').attributes('data-viewport');

    it('is page by default, and fixed when asked', () => {
      expect(viewportOf(mount(BaseShell))).toBe('page');
      expect(viewportOf(mount(BaseShell, { props: { viewport: 'fixed' } }))).toBe('fixed');
    });

    it('is forced fixed by stage mode', () => {
      expect(viewportOf(mount(BaseShell, { props: { main: 'stage', viewport: 'page' } }))).toBe(
        'fixed',
      );
    });

    it('is forced fixed by a filled #floats', () => {
      const w = mount(BaseShell, { props: { viewport: 'page' }, slots: { floats: text('hud') } });
      expect(viewportOf(w)).toBe('fixed');
    });
  });
});
