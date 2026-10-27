import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Tabs, { type TabItem } from '../Tabs.vue';

const mountTabs = (items: TabItem[], modelValue = 'a') =>
  mount(Tabs, { props: { items, modelValue } });

const labels = (w: ReturnType<typeof mountTabs>) =>
  w.findAll('.olui-tabs__trigger').map((t) => t.text());

describe('Tabs', () => {
  it('leaves a tab that is not visible out of the list and the panels', () => {
    const w = mount(Tabs, {
      props: {
        modelValue: 'a',
        items: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B', visible: false },
        ],
      },
      slots: { 'panel-a': () => 'panel a', 'panel-b': () => 'panel b' },
    });
    expect(labels(w)).toEqual(['A']);
    expect(w.html()).not.toContain('panel b');
  });

  it('lays the list out vertically when asked, and horizontally by default', () => {
    const items = [{ value: 'a', label: 'A' }];
    expect(mountTabs(items).find('.olui-tabs').attributes('data-orientation')).toBe('horizontal');
    const w = mount(Tabs, { props: { items, modelValue: 'a', orientation: 'vertical' } });
    expect(w.find('.olui-tabs').attributes('data-orientation')).toBe('vertical');
    expect(w.find('.olui-tabs__trigger').attributes('data-orientation')).toBe('vertical');
  });

  describe('unread', () => {
    const unread = (w: ReturnType<typeof mountTabs>) =>
      w
        .findAll('.olui-tabs__trigger')
        .filter((t) => t.find('.olui-tabs__unread').exists())
        .map((t) => t.text());

    it('marks no tab that is visible when the tabs mount', () => {
      const w = mountTabs([
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ]);
      expect(unread(w)).toEqual([]);
    });

    it('marks a tab revealed after mount, until it is selected', async () => {
      const w = mountTabs([
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', visible: false },
      ]);
      await w.setProps({
        items: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      });
      expect(unread(w)).toEqual(['B']);
      expect(w.findAll('.olui-tabs__trigger')[1]!.attributes()).toHaveProperty('data-unread');

      await w.setProps({ modelValue: 'b' });
      expect(unread(w)).toEqual([]);
    });

    it('does not mark the selected tab', async () => {
      const w = mountTabs([{ value: 'a', label: 'A', notify: false }]);
      await w.setProps({ items: [{ value: 'a', label: 'A', notify: true }] });
      expect(unread(w)).toEqual([]);
    });

    it('marks a tab each time its notify turns true while it is not selected', async () => {
      const at = (notify: boolean): TabItem[] => [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', notify },
      ];
      const w = mountTabs(at(false));
      await w.setProps({ items: at(true) });
      expect(unread(w)).toEqual(['B']);

      await w.setProps({ modelValue: 'b' });
      await w.setProps({ modelValue: 'a', items: at(false) });
      expect(unread(w)).toEqual([]);
      await w.setProps({ items: at(true) });
      expect(unread(w)).toEqual(['B']);
    });
  });
});
