import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { DecimalSource } from 'open-loop-engine';
import ResourceHeaderStrip from '../ResourceHeaderStrip.vue';
import type { ResourceReadout, ResourceHighlight } from '../ResourceHeaderStrip';

function readout(
  id: string,
  opts: Partial<{
    value: DecimalSource;
    rate: DecimalSource;
    hidden: boolean;
    highlight: ResourceHighlight;
  }> = {},
): ResourceReadout {
  return {
    id,
    label: id.toUpperCase(),
    value: ref<DecimalSource>(opts.value ?? 100),
    rate: opts.rate !== undefined ? ref<DecimalSource>(opts.rate) : undefined,
    hidden: opts.hidden !== undefined ? ref(opts.hidden) : undefined,
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

  it('hidden readouts are filtered out (no placeholder)', () => {
    const wrapper = mount(ResourceHeaderStrip, {
      props: { readouts: [readout('coins'), readout('prestige', { hidden: true })] },
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
