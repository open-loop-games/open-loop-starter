import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { h } from 'vue';
import ColumnShell from '../ColumnShell.vue';
import StageShell from '../StageShell.vue';

const text = (s: string) => () => h('p', s);
const regions = {
  default: text('main'),
  topBar: text('top'),
  bottomBar: text('bottom'),
  sideBarLeft: text('left'),
  sideBarRight: text('right'),
};

describe('prefabs', () => {
  it('pass every region slot through to the base', () => {
    for (const prefab of [ColumnShell, StageShell]) {
      const w = mount(prefab, { slots: regions });
      expect(w.find('.olui-shell__top-bar').text()).toBe('top');
      expect(w.find('.olui-shell__bottom-bar').text()).toBe('bottom');
      expect(w.find('.olui-shell__side-bar-left').text()).toBe('left');
      expect(w.find('.olui-shell__side-bar-right').text()).toBe('right');
      expect(w.find('.olui-shell__main').text()).toBe('main');
    }
  });

  it('ColumnShell sets bounded rails and a centre minimum, which a prop overrides', () => {
    const w = mount(ColumnShell, { props: { sideBarRightWidth: '360px' }, slots: regions });
    expect(w.find('.olui-shell').attributes('style')).toContain(
      '--_shell-columns: minmax(250px, 300px) minmax(480px, 1fr) 360px',
    );
    expect(w.find('.olui-shell').attributes('data-main')).toBe('flow');
  });

  it('StageShell is an edge-to-edge stage in a fixed viewport', () => {
    const shell = mount(StageShell, { slots: { default: text('arena') } }).find('.olui-shell');
    expect(shell.attributes('data-main')).toBe('stage');
    expect(shell.attributes('data-viewport')).toBe('fixed');
    expect(shell.attributes()).toHaveProperty('data-stage-bleed');
  });

  it('keeps the base defaults it does not set', () => {
    const shell = mount(ColumnShell, { props: { maxWidth: '800px' } }).find('.olui-shell');
    expect(shell.attributes('data-viewport')).toBe('page');
    expect(shell.attributes()).toHaveProperty('data-bleed-bars');
  });
});
