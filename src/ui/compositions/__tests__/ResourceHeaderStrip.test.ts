import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { DecimalSource } from '@open-loop/engine';
import ResourceHeaderStrip from '../ResourceHeaderStrip.vue';
import type { ResourceReadout, ResourceHighlight } from '../ResourceHeaderStrip';

function readout(
  id: string,
  opts: Partial<{
    value: DecimalSource;
    rate: DecimalSource;
    capacity: DecimalSource;
    visible: boolean;
    highlight: ResourceHighlight;
  }> = {},
): ResourceReadout {
  return {
    id,
    label: id.toUpperCase(),
    value: ref<DecimalSource>(opts.value ?? 100),
    rate: opts.rate !== undefined ? ref<DecimalSource>(opts.rate) : undefined,
    capacity: opts.capacity !== undefined ? ref<DecimalSource>(opts.capacity) : undefined,
    visible: opts.visible !== undefined ? ref(opts.visible) : undefined,
    highlight: opts.highlight !== undefined ? ref(opts.highlight) : undefined,
  };
}

describe('ResourceHeaderStrip', () => {
  it('renders one chip per readout', () => {
    const wrapper = mount(ResourceHeaderStrip, {
      props: { readouts: [readout('coins'), readout('gems')] },
    });
    expect(wrapper.findAll('[data-readout-id]')).toHaveLength(2);
  });

  it('a readout with visible false is left out (no placeholder)', () => {
    const wrapper = mount(ResourceHeaderStrip, {
      props: { readouts: [readout('coins'), readout('prestige', { visible: false })] },
    });
    const ids = wrapper.findAll('[data-readout-id]').map((w) => w.attributes('data-readout-id'));
    expect(ids).toEqual(['coins']);
  });

  it('rate is rendered when present, omitted when absent', () => {
    const withRate = mount(ResourceHeaderStrip, {
      props: { readouts: [readout('coins', { rate: 2.5 })] },
    });
    expect(withRate.find('.resource-header-strip__rate').exists()).toBe(true);
    expect(withRate.html()).toContain('/s');

    const noRate = mount(ResourceHeaderStrip, {
      props: { readouts: [readout('coins')] },
    });
    expect(noRate.find('.resource-header-strip__rate').exists()).toBe(false);
  });

  it('highlight value lands on the chip as a data attribute', () => {
    const wrapper = mount(ResourceHeaderStrip, {
      props: { readouts: [readout('coins', { highlight: 'deficit' })] },
    });
    expect(wrapper.find('[data-readout-id="coins"]').attributes('data-highlight')).toBe('deficit');
  });

  it('capacity shows as `value / capacity` when present', () => {
    const wrapper = mount(ResourceHeaderStrip, {
      props: { readouts: [readout('catnip', { value: 73, capacity: 200 })] },
    });
    const text = wrapper.find('[data-readout-id="catnip"] .resource-header-strip__value').text();
    expect(text.replace(/\s+/g, ' ')).toBe('73 / 200');
  });

  it('capacity absent → no `/` in the value cell', () => {
    const wrapper = mount(ResourceHeaderStrip, {
      props: { readouts: [readout('science', { value: 412 })] },
    });
    const text = wrapper.find('[data-readout-id="science"] .resource-header-strip__value').text();
    expect(text).not.toContain('/');
  });

  it('negative rate keeps its leading minus (no double sign)', () => {
    const wrapper = mount(ResourceHeaderStrip, {
      props: { readouts: [readout('catnip', { rate: -4.25 })] },
    });
    const rate = wrapper.find('.resource-header-strip__rate').text();
    expect(rate.startsWith('-')).toBe(true);
    expect(rate.startsWith('+-')).toBe(false);
  });

  it('orientation stamps the wrapper', () => {
    const sidebar = mount(ResourceHeaderStrip, {
      props: { readouts: [readout('coins')], orientation: 'vertical-sidebar' },
    });
    expect(sidebar.find('.resource-header-strip').attributes('data-orientation')).toBe(
      'vertical-sidebar',
    );
  });

  it('#leading and #trailing slots inject content into the bar', () => {
    const wrapper = mount(ResourceHeaderStrip, {
      props: { readouts: [readout('coins')] },
      slots: {
        leading: '<span class="leading-marker">L</span>',
        trailing: '<span class="trailing-marker">T</span>',
      },
    });
    expect(wrapper.find('.leading-marker').exists()).toBe(true);
    expect(wrapper.find('.trailing-marker').exists()).toBe(true);
  });
});
