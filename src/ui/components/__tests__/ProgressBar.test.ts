import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ProgressBar from '../ProgressBar.vue';

const fillStyle = (html: string, idx = 0) => {
  const matches = [...html.matchAll(/olui-progress-bar__fill[^>]*style="([^"]*)"/g)];
  return matches[idx]?.[1] ?? '';
};

describe('<ProgressBar />', () => {
  describe('plain mode', () => {
    it('renders a single fill at value/max', () => {
      const wrapper = mount(ProgressBar, { props: { value: 0.6, max: 1 } });
      expect(wrapper.find('.olui-progress-bar').exists()).toBe(true);
      expect(wrapper.find('.olui-progress-bar__track').exists()).toBe(true);
      const fills = wrapper.findAll('.olui-progress-bar__fill');
      expect(fills).toHaveLength(1);
      expect(fills[0].attributes('style')).toContain('width: 60%');
    });

    it('defaults to value=0, max=1 → empty', () => {
      const wrapper = mount(ProgressBar);
      expect(wrapper.find('.olui-progress-bar').attributes('data-state')).toBe('empty');
      expect(fillStyle(wrapper.html())).toContain('width: 0%');
    });

    it('sets data-state="full" at value === max', () => {
      const wrapper = mount(ProgressBar, { props: { value: 1, max: 1 } });
      expect(wrapper.find('.olui-progress-bar').attributes('data-state')).toBe('full');
    });

    it('sets data-state="partial" between empty and full', () => {
      const wrapper = mount(ProgressBar, { props: { value: 0.3, max: 1 } });
      expect(wrapper.find('.olui-progress-bar').attributes('data-state')).toBe('partial');
    });

    it('clamps overshoot to 100% and reports full', () => {
      const wrapper = mount(ProgressBar, { props: { value: 5, max: 1 } });
      expect(wrapper.find('.olui-progress-bar').attributes('data-state')).toBe('full');
      expect(fillStyle(wrapper.html())).toContain('width: 100%');
    });

    it('clamps negative to 0% and reports empty', () => {
      const wrapper = mount(ProgressBar, { props: { value: -0.5, max: 1 } });
      expect(wrapper.find('.olui-progress-bar').attributes('data-state')).toBe('empty');
      expect(fillStyle(wrapper.html())).toContain('width: 0%');
    });

    it('handles max === 0 without dividing by zero', () => {
      const wrapper = mount(ProgressBar, { props: { value: 1, max: 0 } });
      expect(wrapper.find('.olui-progress-bar').attributes('data-state')).toBe('empty');
      expect(fillStyle(wrapper.html())).toContain('width: 0%');
    });

    it('honors non-default max', () => {
      const wrapper = mount(ProgressBar, { props: { value: 25, max: 100 } });
      expect(fillStyle(wrapper.html())).toContain('width: 25%');
      expect(wrapper.find('.olui-progress-bar').attributes('data-state')).toBe('partial');
    });
  });

  describe('segmented mode', () => {
    it('renders one fill element per segment', () => {
      const wrapper = mount(ProgressBar, {
        props: {
          segments: [{ value: 0.6 }, { value: 0.3 }, { value: 0.1 }],
        },
      });
      const fills = wrapper.findAll('.olui-progress-bar__fill');
      expect(fills).toHaveLength(3);
      expect(fills[0].attributes('style')).toContain('width: 60%');
      expect(fills[1].attributes('style')).toContain('width: 30%');
      expect(fills[2].attributes('style')).toMatch(/width: 10(\.\d+)?%/);
    });

    it('applies per-segment classes to the fill element', () => {
      const wrapper = mount(ProgressBar, {
        props: {
          segments: [
            { value: 0.5, class: 'olui-progress-bar__fill--danger' },
            { value: 0.5, class: 'olui-progress-bar__fill--success' },
          ],
        },
      });
      const fills = wrapper.findAll('.olui-progress-bar__fill');
      expect(fills[0].classes()).toContain('olui-progress-bar__fill--danger');
      expect(fills[1].classes()).toContain('olui-progress-bar__fill--success');
    });

    it('reports empty when all segments are 0', () => {
      const wrapper = mount(ProgressBar, {
        props: { segments: [{ value: 0 }, { value: 0 }] },
      });
      expect(wrapper.find('.olui-progress-bar').attributes('data-state')).toBe('empty');
    });

    it('reports full when all segments are 1', () => {
      const wrapper = mount(ProgressBar, {
        props: { segments: [{ value: 1 }, { value: 1 }] },
      });
      expect(wrapper.find('.olui-progress-bar').attributes('data-state')).toBe('full');
    });

    it('reports partial otherwise', () => {
      const wrapper = mount(ProgressBar, {
        props: { segments: [{ value: 1 }, { value: 0.3 }] },
      });
      expect(wrapper.find('.olui-progress-bar').attributes('data-state')).toBe('partial');
    });

    it('reports empty when segments is []', () => {
      const wrapper = mount(ProgressBar, { props: { segments: [] } });
      expect(wrapper.find('.olui-progress-bar').attributes('data-state')).toBe('empty');
      expect(wrapper.findAll('.olui-progress-bar__fill')).toHaveLength(0);
    });

    it('ignores value/max when segments is set', () => {
      const wrapper = mount(ProgressBar, {
        props: { value: 0.99, max: 1, segments: [{ value: 0.1 }] },
      });
      const fills = wrapper.findAll('.olui-progress-bar__fill');
      expect(fills).toHaveLength(1);
      expect(fills[0].attributes('style')).toContain('width: 10');
    });
  });

  describe('label overlay', () => {
    it('is absent by default', () => {
      const wrapper = mount(ProgressBar, { props: { value: 0.5 } });
      expect(wrapper.find('.olui-progress-bar__label').exists()).toBe(false);
    });

    it('renders when label prop is set', () => {
      const wrapper = mount(ProgressBar, { props: { value: 0.5, label: '5/10 owned' } });
      const label = wrapper.find('.olui-progress-bar__label');
      expect(label.exists()).toBe(true);
      expect(label.text()).toBe('5/10 owned');
    });
  });
});
