import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { DecimalSource } from '@open-loop/engine';
import UpgradeGrid from '../UpgradeGrid.vue';
import type { UpgradeCardData } from '../UpgradeGrid';

function makeCard(
  id: string,
  opts: Partial<{ owned: boolean; canPurchase: boolean; position: number }> = {},
): UpgradeCardData {
  return {
    id,
    displayName: `Card ${id}`,
    description: `desc ${id}`,
    cost: ref<DecimalSource>(50),
    costLabel: 'coins',
    canPurchase: ref(opts.canPurchase ?? true),
    owned: ref(opts.owned ?? false),
    purchase: vi.fn(),
    position: opts.position,
    formula: () => `2 * ${id}`,
  };
}

describe('UpgradeGrid', () => {
  it('applies `columns` to the grid-template-columns style', () => {
    const wrapper = mount(UpgradeGrid, {
      props: { cards: [makeCard('a')], columns: 3, reveal: 'inline' },
    });
    const grid = wrapper.find('.upgrade-grid').element as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
  });

  it('purchasedState="removed" filters out owned cards', () => {
    const cards = [makeCard('a', { owned: false }), makeCard('b', { owned: true })];
    const wrapper = mount(UpgradeGrid, {
      props: { cards, reveal: 'inline', purchasedState: 'removed' },
    });
    expect(wrapper.findAll('.upgrade-grid__cell-wrap')).toHaveLength(1);
    expect(wrapper.html()).not.toContain('Card b');
  });

  it('purchasedState="checkmark" renders ✓ on owned cards; "greyed" renders "Purchased"', () => {
    const cards = [makeCard('a', { owned: true })];

    const check = mount(UpgradeGrid, {
      props: { cards, reveal: 'inline', purchasedState: 'checkmark' },
    });
    expect(check.html()).toContain('✓ Purchased');

    const grey = mount(UpgradeGrid, {
      props: { cards, reveal: 'inline', purchasedState: 'greyed' },
    });
    expect(grey.html()).toContain('Purchased');
    expect(grey.html()).not.toContain('✓');
  });

  it('reveal="inline" renders the description inline (no Tooltip wrapper)', () => {
    const wrapper = mount(UpgradeGrid, {
      props: { cards: [makeCard('a')], reveal: 'inline' },
    });
    expect(wrapper.find('.upgrade-grid__cell-desc').exists()).toBe(true);
    expect(wrapper.find('.olui-tooltip__content').exists()).toBe(false);
  });

  it('canPurchase blocks the purchase button while false; click invokes card.purchase', async () => {
    const card = makeCard('a', { canPurchase: false });
    const wrapper = mount(UpgradeGrid, {
      props: { cards: [card], reveal: 'inline' },
    });
    expect(wrapper.find('[data-testid="purchase-a"]').attributes('disabled')).toBeDefined();

    const card2 = makeCard('b', { canPurchase: true });
    const wrapper2 = mount(UpgradeGrid, {
      props: { cards: [card2], reveal: 'inline' },
    });
    await wrapper2.find('[data-testid="purchase-b"]').trigger('pointerdown');
    expect(card2.purchase).toHaveBeenCalledTimes(1);
  });

  it('showFormula reveals card.formula() output', () => {
    const off = mount(UpgradeGrid, {
      props: { cards: [makeCard('a')], reveal: 'inline', showFormula: false },
    });
    expect(off.html()).not.toContain('2 * a');

    const on = mount(UpgradeGrid, {
      props: { cards: [makeCard('a')], reveal: 'inline', showFormula: true },
    });
    expect(on.html()).toContain('2 * a');
  });

  it('card.position drives CSS order on the wrapper', () => {
    const wrapper = mount(UpgradeGrid, {
      props: { cards: [makeCard('a', { position: 5 })], reveal: 'inline' },
    });
    const el = wrapper.find('.upgrade-grid__cell-wrap').element as HTMLElement;
    expect(el.style.order).toBe('5');
  });

  it('#card slot replaces the default card template', () => {
    const wrapper = mount(UpgradeGrid, {
      props: { cards: [makeCard('a')], reveal: 'inline' },
      slots: {
        card: `<template #card="{ card }"><div class="custom-card">{{ card.id }}</div></template>`,
      },
    });
    expect(wrapper.find('.custom-card').exists()).toBe(true);
    expect(wrapper.find('.upgrade-grid__cell').exists()).toBe(false);
  });

  it('hands a #card slot the description as text, a function read at render', () => {
    const lit = ref('dark');
    const card = { ...makeCard('a'), description: () => `the hall is ${lit.value}` };
    const wrapper = mount(UpgradeGrid, {
      props: { cards: [card], reveal: 'inline' },
      slots: {
        card: `<template #card="{ description }"><p class="custom-desc">{{ description }}</p></template>`,
      },
    });
    expect(wrapper.find('.custom-desc').text()).toBe('the hall is dark');
  });

  it('lays out as one column by default', () => {
    const wrapper = mount(UpgradeGrid, { props: { cards: [makeCard('a')], reveal: 'inline' } });
    const grid = wrapper.find('.upgrade-grid').element as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(1, 1fr)');
  });

  it('filters out a card that is not unlocked', () => {
    const cards = [makeCard('a'), { ...makeCard('b'), unlocked: ref(false) }];
    const wrapper = mount(UpgradeGrid, { props: { cards, reveal: 'inline' } });
    expect(wrapper.findAll('.upgrade-grid__cell-wrap')).toHaveLength(1);
  });

  it('shows unmet prerequisites in place of the button, and marks the card locked', () => {
    const card = { ...makeCard('a'), unmet: ref(['A mill']) };
    const wrapper = mount(UpgradeGrid, { props: { cards: [card], reveal: 'inline' } });
    expect(wrapper.find('[data-testid="purchase-a"]').exists()).toBe(false);
    expect(wrapper.find('.upgrade-grid__cell-unmet').text()).toBe('A mill');
    expect(wrapper.find('.upgrade-grid__cell').attributes('data-locked')).toBeDefined();
  });
});
