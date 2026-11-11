import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createEngine, createMemoryStorage, type ModDef } from '@open-loop/engine';
import SlotScreen from '../SlotScreen.vue';

const idleTimers = { setInterval: () => 0, clearInterval: () => {} };

function mod(id: string): ModDef {
  return { id, displayName: id, modules: [] };
}

function mountScreen(mods: ModDef[]) {
  const engine = createEngine({
    gameId: `slot-screen-${mods.length}`,
    persistenceNamespace: `slot-screen-${mods.length}`,
    storageAdapter: createMemoryStorage(),
    timerProvider: idleTimers,
    mods,
  });
  return mount(SlotScreen, { props: { engine, appName: 'Test' } });
}

describe('SlotScreen', () => {
  it('starts a lone mod from New Game, with no picker', () => {
    const w = mountScreen([mod('only')]);
    expect(w.text()).not.toContain('Select a Mod');

    (w.get('.btn-primary').element as HTMLElement).click();
    expect(w.text()).not.toContain('Select a Mod');
    const [slotId, modId] = w.emitted<[number, string?]>('start')![0];
    expect(typeof slotId).toBe('number');
    expect(modId).toBe('only');
  });

  it('opens the picker on first launch when there is a choice of mods', () => {
    const w = mountScreen([mod('a'), mod('b')]);
    expect(w.text()).toContain('Select a Mod');
    expect(w.emitted('start')).toBeUndefined();
  });
});
