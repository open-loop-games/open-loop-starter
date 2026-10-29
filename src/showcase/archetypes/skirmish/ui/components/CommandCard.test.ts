import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { Decimal } from '@open-loop/engine';
import { boot } from '../../sim/harness';
import { getMatch } from '../../modules/match';
import { destination } from '../../modules/travel';
import { createSelection } from '../command';
import CommandCard from './CommandCard.vue';

const DOCKS = 1;
const STEPS = 2;

function card() {
  const selection = createSelection();
  const wrapper = mount(CommandCard, { props: { selection } });
  const press = (label: string) => wrapper.get(`[aria-label="${label}"]`).trigger('pointerdown');
  return { selection, wrapper, press };
}

describe('the command card', () => {
  beforeEach(() => {
    boot();
    getMatch().start();
  });

  it('selects a place and sends its squad, with no field', async () => {
    const { p } = getMatch();
    p.squads[DOCKS]!.razor.value = new Decimal(3);
    const { selection, press } = card();
    await press('Select Ashfall Docks');
    expect(selection.picks).toEqual([{ kind: 'squad', place: DOCKS }]);
    await press('Send to Spire Steps');
    expect(p.convoys.value.map(destination)).toEqual([STEPS]);
  });

  it('routes a send through the districts pressed first', async () => {
    const { p } = getMatch();
    p.reserve.razor.value = new Decimal(2);
    const { press } = card();
    await press('Select Home');
    await press('Through Neon Narrows');
    await press('Send to Spire Steps');
    expect(p.convoys.value[0]!.path).toEqual([0, STEPS]);
  });

  it('opens the selected place’s own orders', async () => {
    const { wrapper, press } = card();
    await press('Select Ashfall Docks');
    expect(wrapper.find('article[aria-label="Ashfall Docks"]').exists()).toBe(true);
    await press('Select Home');
    expect(wrapper.find('article[aria-label="Your safehouse"]').exists()).toBe(true);
  });
});
