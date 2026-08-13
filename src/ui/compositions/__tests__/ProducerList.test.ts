import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { Decimal, type DecimalSource } from '@open-loop/engine';

vi.mock('@/composables/useBulkMode', () => {
  const mode = ref<number | 'max'>('max');
  return {
    useBulkMode: () => ({
      mode,
      setMode: (n: number | 'max') => {
        mode.value = n;
      },
      resolveAmount: (max: DecimalSource) => max,
    }),
  };
});

import ProducerList from '../ProducerList.vue';
import type { ProducerRowData } from '../ProducerList';

function makeRow(
  id: string,
  opts: Partial<{ unlocked: boolean; canBuy: boolean }> = {},
): ProducerRowData {
  const buy = vi.fn();
  return {
    id,
    name: `Row ${id}`,
    count: ref<DecimalSource>(7),
    displayRate: ref<DecimalSource>(1.5),
    cost: (amount) => Decimal.mul(amount, 10),
    canBuy: () => opts.canBuy ?? true,
    maxAffordable: ref<DecimalSource>(3),
    buy,
    unlocked: opts.unlocked === undefined ? ref(true) : ref(opts.unlocked),
  };
}

describe('ProducerList', () => {
  it('renders one row per unlocked entry; filters unlocked=false', () => {
    const rows = [makeRow('a'), makeRow('b', { unlocked: false }), makeRow('c')];
    const wrapper = mount(ProducerList, {
      props: { rows, costLabel: 'coins', bulkModeSource: 'none' },
    });
    expect(wrapper.findAll('.producer-list__row')).toHaveLength(2);
    expect(wrapper.html()).toContain('Row a');
    expect(wrapper.html()).not.toContain('Row b');
  });

  it('density="card" stamps the wrapper data attribute', () => {
    const wrapper = mount(ProducerList, {
      props: { rows: [makeRow('a')], costLabel: 'c', bulkModeSource: 'none', density: 'card' },
    });
    expect(wrapper.find('.producer-list').attributes('data-density')).toBe('card');
  });

  it('bulkModeSource="global" renders the BulkModeSelector; "none" omits it', () => {
    const withGlobal = mount(ProducerList, {
      props: { rows: [makeRow('a')], costLabel: 'c', bulkModeSource: 'global' },
    });
    expect(withGlobal.find('.olui-bulk-mode').exists()).toBe(true);

    const withNone = mount(ProducerList, {
      props: { rows: [makeRow('a')], costLabel: 'c', bulkModeSource: 'none' },
    });
    expect(withNone.find('.olui-bulk-mode').exists()).toBe(false);
  });

  it('clicking the buy button calls row.buy with the resolved amount', async () => {
    const row = makeRow('a');
    const wrapper = mount(ProducerList, {
      props: { rows: [row], costLabel: 'c', bulkModeSource: 'none' },
    });
    await wrapper.find('[data-testid="buy-a"]').trigger('pointerdown');
    // bulkModeSource='none' resolves to 1; row.buy invoked with that amount.
    const buyMock = row.buy as ReturnType<typeof vi.fn>;
    expect(buyMock).toHaveBeenCalledTimes(1);
    expect(Decimal.eq(buyMock.mock.calls[0][0] as DecimalSource, 1)).toBe(true);
  });

  it('canBuy(amount) gates the buy button disabled state', () => {
    const row = makeRow('a', { canBuy: false });
    const wrapper = mount(ProducerList, {
      props: { rows: [row], costLabel: 'c', bulkModeSource: 'none' },
    });
    expect(wrapper.find('[data-testid="buy-a"]').attributes('disabled')).toBeDefined();
  });

  it('#row slot replaces the default row template', () => {
    const wrapper = mount(ProducerList, {
      props: { rows: [makeRow('a')], costLabel: 'c', bulkModeSource: 'none' },
      slots: {
        row: `<template #row="{ row }"><div class="custom-row">CUSTOM-{{ row.id }}</div></template>`,
      },
    });
    expect(wrapper.find('.custom-row').exists()).toBe(true);
    expect(wrapper.find('.custom-row').text()).toBe('CUSTOM-a');
    expect(wrapper.find('.producer-list__row-body').exists()).toBe(false);
  });

  it('quotes the price of one when nothing is affordable, and stays disabled', () => {
    // Regression: `maxAffordable` is 0 while the player saves up, and quoting
    // `cost(0)` rendered the price as 0 — the row hid what it cost exactly when
    // that was the only thing the player wanted to know.
    const row: ProducerRowData = { ...makeRow('a', { canBuy: false }), maxAffordable: ref(0) };
    const wrapper = mount(ProducerList, {
      props: { rows: [row], costLabel: 'coins', bulkModeSource: 'none' },
    });
    const button = wrapper.find('[data-testid="buy-a"]');
    expect(button.text()).toContain('10 coins');
    expect(button.text()).not.toContain('Buy 0');
    expect(button.attributes('disabled')).toBeDefined();
  });

  it('forwards a typed extra payload to the #row slot (the extension seam)', () => {
    // The contract-first seam: a story parameterizes the component with its own
    // payload type and reads it back in the slot — no cast, no side lookup. This
    // is what replaces growing the core contract for every consumer's shape.
    interface RichRow {
      def: { flavor: string };
    }
    const row: ProducerRowData<RichRow> = { ...makeRow('a'), extra: { def: { flavor: 'spicy' } } };
    const wrapper = mount(ProducerList<RichRow>, {
      props: { rows: [row], costLabel: 'c', bulkModeSource: 'none' },
      slots: {
        row: `<template #row="{ row }"><span class="flavor">{{ row.extra.def.flavor }}</span></template>`,
      },
    });
    expect(wrapper.find('.flavor').text()).toBe('spicy');
  });
});
