import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CreditList, { type GameCredit } from '../CreditList.vue';

const kenney: GameCredit = {
  what: 'City models',
  by: 'Kenney',
  url: 'https://www.kenney.nl',
  license: 'CC0',
};

describe('CreditList', () => {
  it('names what each credit covers, who made it, and its license', () => {
    const w = mount(CreditList, { props: { credits: [kenney] } });
    const item = w.get('.olui-credit-list__item');
    expect(item.get('.olui-credit-list__what').text()).toBe('City models');
    expect(item.get('.olui-credit-list__by').text()).toBe('Kenney');
    expect(item.get('.olui-credit-list__license').text()).toBe('CC0');
  });

  it('links the maker to its source in a new tab, and names a maker without one plainly', () => {
    const w = mount(CreditList, {
      props: {
        credits: [kenney, { what: 'Text face', by: 'Igino Marini', license: 'SIL OFL 1.1' }],
      },
    });
    const [linked, plain] = w.findAll('.olui-credit-list__by');
    expect(linked!.element.tagName).toBe('A');
    expect(linked!.attributes()).toMatchObject({ href: 'https://www.kenney.nl', target: '_blank' });
    expect(plain!.element.tagName).toBe('SPAN');
  });

  it('renders nothing for a game with no credits', () => {
    const w = mount(CreditList, { props: { credits: [] } });
    expect(w.find('.olui-credit-list').exists()).toBe(false);
  });
});
