import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { Decimal } from '@open-loop/engine';
import type { Place } from '../../data/map';
import { boot } from '../../sim/harness';
import { getMatch } from '../../modules/match';
import { destination } from '../../modules/travel';
import { createSelection, type Pick } from '../command';
import SkirmishField from './SkirmishField.vue';

/** What the stand-in scene finds under the pointer, set by each test. */
const under: { pick: Pick | null; place: Place | null } = { pick: null, place: null };
const disposed = vi.fn();

// jsdom has no WebGL: the scene is stood in, so the host's own routing is what runs.
vi.mock('../field/skirmish-scene', () => ({
  SkirmishScene: class {
    render() {}
    resize() {}
    snap() {}
    pan() {}
    zoomAt() {}
    pick = () => under.pick;
    placeAt = () => under.place;
    picksIn = () => [];
    screenOf = () => ({ x: 0, y: 0 });
    tagAnchor = () => ({ x: 0, y: 0 });
    screenOfConvoy = () => ({ x: 0, y: 0 });
    dispose = disposed;
  },
}));

// Nor a ResizeObserver: the stand-in scene has nothing to size.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    disconnect() {}
  },
);

const DOCKS = 1;
const STEPS = 2;

let wrapper: VueWrapper | undefined;
function field() {
  const selection = createSelection();
  wrapper = mount(SkirmishField, { props: { selection }, attachTo: document.body });
  return { selection, el: wrapper.get('.field') };
}

describe('the field', () => {
  beforeEach(() => {
    boot();
    getMatch().start();
    under.pick = null;
    under.place = null;
  });
  afterEach(() => wrapper?.unmount());

  it('selects what a left-click lands on, and lets go on empty ground', async () => {
    const { selection, el } = field();
    under.pick = { kind: 'squad', place: DOCKS };
    await el.trigger('pointerdown');
    await el.trigger('pointerup');
    expect(selection.picks).toEqual([{ kind: 'squad', place: DOCKS }]);
    under.pick = null;
    await el.trigger('pointerdown');
    await el.trigger('pointerup');
    expect(selection.picks).toEqual([]);
  });

  it('sends the selection where a right-click lands', async () => {
    const { p } = getMatch();
    p.squads[DOCKS]!.razor.value = new Decimal(3);
    const { selection, el } = field();
    selection.picks.push({ kind: 'squad', place: DOCKS });
    under.place = STEPS;
    await el.trigger('contextmenu');
    expect(p.convoys.value.map(destination)).toEqual([STEPS]);
  });

  it('queues waypoints on shift+right-click and sends to the last when shift lets go', async () => {
    const { p } = getMatch();
    p.reserve.razor.value = new Decimal(2);
    const { selection, el } = field();
    selection.picks.push({ kind: 'squad', place: 'p' });
    under.place = 0;
    await el.trigger('contextmenu', { shiftKey: true });
    under.place = STEPS;
    await el.trigger('contextmenu', { shiftKey: true });
    expect(p.convoys.value).toEqual([]);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
    expect(p.convoys.value[0]!.path).toEqual([0, STEPS]);
  });

  it('gives back its scene when it unmounts', () => {
    field();
    disposed.mockClear();
    wrapper!.unmount();
    wrapper = undefined;
    expect(disposed).toHaveBeenCalledOnce();
  });
});
