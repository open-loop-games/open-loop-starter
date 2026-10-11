import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { DecimalSource } from '@open-loop/engine';
import UpgradeGrid from '../UpgradeGrid.vue';
import type { UpgradeCellData } from '../UpgradeGrid';

function makeCell(
  id: string,
  opts: Partial<{ owned: boolean; canPurchase: boolean; position: number }> = {},
): UpgradeCellData {
  return {
    id,
    displayName: `Cell ${id}`,
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
      props: { cells: [makeCell('a')], columns: 3, reveal: 'inline' },
    });
    const grid = wrapper.find('.upgrade-grid').element as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
  });

  it('purchasedState="removed" filters out owned cells', () => {
    const cells = [makeCell('a', { owned: false }), makeCell('b', { owned: true })];
    const wrapper = mount(UpgradeGrid, {
      props: { cells, reveal: 'inline', purchasedState: 'removed' },
    });
    expect(wrapper.findAll('.upgrade-grid__cell-wrap')).toHaveLength(1);
    expect(wrapper.html()).not.toContain('Cell b');
  });

  it('purchasedState="checkmark" renders ✓ on owned cells; "greyed" renders "Bought"', () => {
    const cells = [makeCell('a', { owned: true })];

    const check = mount(UpgradeGrid, {
      props: { cells, reveal: 'inline', purchasedState: 'checkmark' },
    });
    expect(check.html()).toContain('✓ Bought');

    const grey = mount(UpgradeGrid, {
      props: { cells, reveal: 'inline', purchasedState: 'greyed' },
    });
    expect(grey.html()).toContain('Bought');
    expect(grey.html()).not.toContain('✓');
  });

  it('reveal="inline" renders the description inline (no Tooltip wrapper)', () => {
    const wrapper = mount(UpgradeGrid, {
      props: { cells: [makeCell('a')], reveal: 'inline' },
    });
    expect(wrapper.find('.upgrade-grid__cell-desc').exists()).toBe(true);
    expect(wrapper.find('.olui-tooltip__content').exists()).toBe(false);
  });

  it('canPurchase blocks the purchase button while false; click invokes cell.purchase', async () => {
    const cell = makeCell('a', { canPurchase: false });
    const wrapper = mount(UpgradeGrid, {
      props: { cells: [cell], reveal: 'inline' },
    });
    expect(wrapper.find('[data-testid="purchase-a"]').attributes('disabled')).toBeDefined();

    const cell2 = makeCell('b', { canPurchase: true });
    const wrapper2 = mount(UpgradeGrid, {
      props: { cells: [cell2], reveal: 'inline' },
    });
    await wrapper2.find('[data-testid="purchase-b"]').trigger('pointerdown');
    expect(cell2.purchase).toHaveBeenCalledTimes(1);
  });

  it('showFormula reveals cell.formula() output', () => {
    const off = mount(UpgradeGrid, {
      props: { cells: [makeCell('a')], reveal: 'inline', showFormula: false },
    });
    expect(off.html()).not.toContain('2 * a');

    const on = mount(UpgradeGrid, {
      props: { cells: [makeCell('a')], reveal: 'inline', showFormula: true },
    });
    expect(on.html()).toContain('2 * a');
  });

  it('cell.position drives CSS order on the wrapper', () => {
    const wrapper = mount(UpgradeGrid, {
      props: { cells: [makeCell('a', { position: 5 })], reveal: 'inline' },
    });
    const el = wrapper.find('.upgrade-grid__cell-wrap').element as HTMLElement;
    expect(el.style.order).toBe('5');
  });

  it('#cell slot replaces the default cell template', () => {
    const wrapper = mount(UpgradeGrid, {
      props: { cells: [makeCell('a')], reveal: 'inline' },
      slots: {
        cell: `<template #cell="{ cell }"><div class="custom-cell">{{ cell.id }}</div></template>`,
      },
    });
    expect(wrapper.find('.custom-cell').exists()).toBe(true);
    expect(wrapper.find('.upgrade-grid__cell').exists()).toBe(false);
  });
});
