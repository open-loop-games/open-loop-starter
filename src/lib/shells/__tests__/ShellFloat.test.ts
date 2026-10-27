import { describe, it, expect, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { h } from 'vue';
import BaseShell from '../BaseShell.vue';
import ShellFloat from '../ShellFloat.vue';
import StageShell from '../StageShell.vue';
import type { ShellAnchor } from '../shell-props';

// A float teleports into its anchor cell by selector, so the shell must be in the document.
afterEach(() => {
  document.body.innerHTML = '';
});

const float = (anchor: ShellAnchor, label: string) => h(ShellFloat, { anchor }, () => label);

describe('ShellFloat', () => {
  it('lands in its anchor cell, and floats on one anchor stack in slot order', async () => {
    mount(BaseShell, {
      attachTo: document.body,
      slots: {
        default: () => h('canvas'),
        floats: () => [
          float('top-left', 'hp'),
          float('bottom-right', 'minimap'),
          float('top-left', 'xp'),
        ],
      },
    });
    await flushPromises();
    const cell = (a: string) => document.querySelector(`.olui-shell__anchor[data-anchor="${a}"]`)!;
    expect(cell('top-left').textContent).toBe('hpxp');
    expect(cell('bottom-right').textContent).toBe('minimap');
    expect(cell('center').textContent).toBe('');
  });

  it('lands in its cell through a prefab too', async () => {
    mount(StageShell, {
      attachTo: document.body,
      slots: { default: () => h('canvas'), floats: () => float('top', '04:12') },
    });
    await flushPromises();
    expect(document.querySelector('.olui-shell__anchor[data-anchor="top"]')!.textContent).toBe(
      '04:12',
    );
  });

  it('puts a class given to it on the float element', async () => {
    mount(BaseShell, {
      attachTo: document.body,
      slots: { floats: () => h(ShellFloat, { anchor: 'bottom', class: 'xp' }, () => 'xp') },
    });
    await flushPromises();
    expect(document.querySelector('.olui-shell-float.xp')!.textContent).toBe('xp');
  });

  it('renders in place outside a shell', () => {
    const w = mount(ShellFloat, { props: { anchor: 'top' }, slots: { default: () => 'alone' } });
    expect(w.find('.olui-shell-float').text()).toBe('alone');
  });
});
