import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import {
  createModifierChain,
  createMultiplicativeModifier,
  createSequentialModifier,
} from '@open-loop/engine';
import ChainBreakdown from '../ChainBreakdown.vue';

const rows = (w: ReturnType<typeof mount>) =>
  w
    .findAll('.olui-chain-breakdown__row')
    .filter(
      (r) =>
        !r.classes('olui-chain-breakdown__row--base') &&
        !r.classes('olui-chain-breakdown__row--total'),
    );

const totalText = (w: ReturnType<typeof mount>) =>
  w.find('.olui-chain-breakdown__row--total .olui-chain-breakdown__value').text();

describe('ChainBreakdown', () => {
  it('renders one row per described modifier, plus the applied total', () => {
    const modifier = createSequentialModifier([
      createMultiplicativeModifier({ multiplier: 2, description: 'Upgrade' }),
      createMultiplicativeModifier({ multiplier: 3, description: 'Prestige' }),
    ]);
    const w = mount(ChainBreakdown, { props: { title: 'Rate', modifier, base: 1 } });

    expect(rows(w).map((r) => r.find('.olui-chain-breakdown__label').text())).toEqual([
      'Upgrade',
      'Prestige',
    ]);
    expect(totalText(w)).toBe('6.00');
  });

  // The engine's `description` getter filters `enabled === false`, and
  // `ModifierChain.bind()` folds a binding's `active` predicate into that same
  // `enabled` — so a disabled or inactive modifier contributes neither a row
  // nor a factor to the total. Pinned because it is the whole reason this
  // component can stay a dumb pass-through over `description`.
  it('omits disabled modifiers from both the rows and the total', () => {
    const on = ref(false);
    const modifier = createSequentialModifier([
      createMultiplicativeModifier({ multiplier: 2, description: 'Always' }),
      createMultiplicativeModifier({ multiplier: 5, description: 'Locked', enabled: on }),
    ]);
    const w = mount(ChainBreakdown, { props: { title: 'Rate', modifier, base: 1 } });

    expect(rows(w).map((r) => r.find('.olui-chain-breakdown__label').text())).toEqual(['Always']);
    expect(totalText(w)).toBe('2.00');
  });

  it('omits bindings whose active predicate is false', () => {
    const unlocked = ref(false);
    const chain = createModifierChain('test/chain');
    chain.bind({
      modifier: createMultiplicativeModifier({ multiplier: 2, description: 'Base' }),
      id: 'test/base',
    });
    chain.bind({
      modifier: createMultiplicativeModifier({ multiplier: 7, description: 'Gated' }),
      id: 'test/gated',
      active: unlocked,
    });
    const w = mount(ChainBreakdown, { props: { title: 'Rate', modifier: chain, base: 1 } });

    expect(rows(w).map((r) => r.find('.olui-chain-breakdown__label').text())).toEqual(['Base']);
    expect(totalText(w)).toBe('2.00');
  });

  it('shows a placeholder when nothing is contributing', () => {
    const modifier = createSequentialModifier([]);
    const w = mount(ChainBreakdown, { props: { title: 'Rate', modifier, base: 1 } });

    expect(w.find('.olui-chain-breakdown__row--muted').text()).toBe('No active modifiers');
  });

  it('flags the total as bad when a smaller-is-better value grew', () => {
    const modifier = createSequentialModifier([
      createMultiplicativeModifier({ multiplier: 2, description: 'Cost creep' }),
    ]);
    const w = mount(ChainBreakdown, {
      props: { title: 'Cost', modifier, base: 10, unit: 's', smallerIsBetter: true },
    });

    expect(w.find('.olui-chain-breakdown__row--total').classes()).toContain(
      'olui-chain-breakdown__row--bad',
    );
    expect(totalText(w)).toBe('20.00s');
  });
});
