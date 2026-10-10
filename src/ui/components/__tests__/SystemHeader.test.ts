import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createEngine, createMemoryStorage } from '@open-loop/engine';
import { usePlayerPrefs } from '@/composables/usePlayerPrefs';
import SystemHeader from '../SystemHeader.vue';

const idleTimers = { setInterval: () => 0, clearInterval: () => {} };

// jsdom has no matchMedia; usePlayerPrefs reads it for the system theme.
vi.stubGlobal('matchMedia', () => ({
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
}));

describe('SystemHeader', () => {
  it("drives the engine's autosave interval from the player prefs", async () => {
    const engine = createEngine({
      gameId: 'header-test',
      storageAdapter: createMemoryStorage(),
      timerProvider: idleTimers,
    });
    const prefs = usePlayerPrefs();
    prefs.autoSave.value = true;
    prefs.autoSaveIntervalMs.value = 45_000;
    const w = mount(SystemHeader, { global: { provide: { engine } } });
    expect(engine.autoSaveInterval).toBe(45_000);

    prefs.autoSave.value = false;
    await nextTick();
    expect(engine.autoSaveInterval).toBe(0);

    prefs.autoSave.value = true;
    await nextTick();
    w.unmount();
    expect(engine.autoSaveInterval).toBe(0);
    engine.dispose();
  });
});
