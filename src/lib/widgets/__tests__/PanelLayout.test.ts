import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PanelLayout from '../PanelLayout.vue';

describe('<PanelLayout />', () => {
  describe('structure', () => {
    it('renders root + body with default slot content', () => {
      const wrapper = mount(PanelLayout, { slots: { default: '<p>hello</p>' } });
      expect(wrapper.find('.olui-panel').exists()).toBe(true);
      expect(wrapper.find('.olui-panel__body').exists()).toBe(true);
      expect(wrapper.find('.olui-panel__body').html()).toContain('<p>hello</p>');
    });

    it('has no data-state attribute (purely structural)', () => {
      const wrapper = mount(PanelLayout);
      expect(wrapper.find('.olui-panel').attributes('data-state')).toBeUndefined();
    });
  });

  describe('title prop', () => {
    it('renders title inside __title when set', () => {
      const wrapper = mount(PanelLayout, { props: { title: 'Save Management' } });
      const title = wrapper.find('.olui-panel__title');
      expect(title.exists()).toBe(true);
      expect(title.text()).toBe('Save Management');
    });

    it('renders the header row when title is set', () => {
      const wrapper = mount(PanelLayout, { props: { title: 'Settings' } });
      expect(wrapper.find('.olui-panel__header').exists()).toBe(true);
    });

    it('omits __title when no title prop is set and no header slot', () => {
      const wrapper = mount(PanelLayout, { props: { closable: false } });
      expect(wrapper.find('.olui-panel__title').exists()).toBe(false);
    });
  });

  describe('header slot', () => {
    it('header slot replaces the default title element', () => {
      const wrapper = mount(PanelLayout, {
        props: { title: 'Fallback' },
        slots: { header: '<div class="custom-header">Custom</div>' },
      });
      expect(wrapper.find('.custom-header').exists()).toBe(true);
      expect(wrapper.find('.olui-panel__title').exists()).toBe(false);
    });

    it('renders the header row when only the header slot is provided', () => {
      const wrapper = mount(PanelLayout, {
        props: { closable: false },
        slots: { header: '<span>Custom</span>' },
      });
      expect(wrapper.find('.olui-panel__header').exists()).toBe(true);
    });
  });

  describe('close button', () => {
    it('renders by default (closable defaults to true)', () => {
      const wrapper = mount(PanelLayout, { props: { title: 'X' } });
      expect(wrapper.find('.olui-panel__close').exists()).toBe(true);
    });

    it('emits close on click', async () => {
      const wrapper = mount(PanelLayout, { props: { title: 'X' } });
      await wrapper.find('.olui-panel__close').trigger('click');
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('is omitted when closable=false', () => {
      const wrapper = mount(PanelLayout, { props: { title: 'X', closable: false } });
      expect(wrapper.find('.olui-panel__close').exists()).toBe(false);
    });

    it('has an accessible label', () => {
      const wrapper = mount(PanelLayout, { props: { closable: true } });
      expect(wrapper.find('.olui-panel__close').attributes('aria-label')).toBe('Close');
    });

    it('is a type=button so form submission is never triggered', () => {
      const wrapper = mount(PanelLayout, { props: { closable: true } });
      expect(wrapper.find('.olui-panel__close').attributes('type')).toBe('button');
    });
  });

  describe('header row omission', () => {
    it('is absent when no title, no header slot, and closable=false', () => {
      const wrapper = mount(PanelLayout, { props: { closable: false } });
      expect(wrapper.find('.olui-panel__header').exists()).toBe(false);
    });

    it('is present when closable=true even without title', () => {
      const wrapper = mount(PanelLayout, { props: { closable: true } });
      expect(wrapper.find('.olui-panel__header').exists()).toBe(true);
    });
  });

  describe('footer slot', () => {
    it('is absent when footer slot has no content', () => {
      const wrapper = mount(PanelLayout);
      expect(wrapper.find('.olui-panel__footer').exists()).toBe(false);
    });

    it('renders footer slot content when provided', () => {
      const wrapper = mount(PanelLayout, {
        slots: { footer: '<button>Confirm</button><button>Cancel</button>' },
      });
      const footer = wrapper.find('.olui-panel__footer');
      expect(footer.exists()).toBe(true);
      expect(footer.html()).toContain('Confirm');
      expect(footer.html()).toContain('Cancel');
    });
  });
});
