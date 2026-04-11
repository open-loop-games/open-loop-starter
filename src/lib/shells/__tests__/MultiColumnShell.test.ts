import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MultiColumnShell from '../MultiColumnShell.vue';

describe('<MultiColumnShell />', () => {
  it('renders N columns when columns is a number', () => {
    const wrapper = mount(MultiColumnShell, {
      props: { columns: 4 },
      slots: {
        'column-0': '<div data-testid="c0">0</div>',
        'column-1': '<div data-testid="c1">1</div>',
        'column-2': '<div data-testid="c2">2</div>',
        'column-3': '<div data-testid="c3">3</div>',
      },
    });
    const cols = wrapper.findAll('.olui-multi-column__col');
    expect(cols).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(cols[i].find(`[data-testid="c${i}"]`).exists()).toBe(true);
      expect(cols[i].attributes('data-column-index')).toBe(String(i));
    }
  });

  it('applies uniform grid template when columns is a number', () => {
    const wrapper = mount(MultiColumnShell, { props: { columns: 3 } });
    const style = wrapper.element.getAttribute('style') ?? '';
    expect(style).toContain('--olui-multi-column-template: repeat(3, 1fr)');
  });

  it('applies explicit grid template when columns is an array', () => {
    const wrapper = mount(MultiColumnShell, {
      props: { columns: ['200px', '1fr', '200px'] },
    });
    const style = wrapper.element.getAttribute('style') ?? '';
    expect(style).toContain('--olui-multi-column-template: 200px 1fr 200px');
    expect(wrapper.findAll('.olui-multi-column__col')).toHaveLength(3);
  });

  it('supports 5 columns (Cavernous II shape)', () => {
    const wrapper = mount(MultiColumnShell, { props: { columns: 5 } });
    expect(wrapper.findAll('.olui-multi-column__col')).toHaveLength(5);
  });
});
