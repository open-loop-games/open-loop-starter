import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { modalStackKey, useModalStack } from '@/lib';
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
// Nor a ResizeObserver; the About popover's positioning observes its trigger.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

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

  it('pushes Save and Settings onto the stack the frame provides', async () => {
    const engine = createEngine({
      gameId: 'header-stack-test',
      storageAdapter: createMemoryStorage(),
      timerProvider: idleTimers,
    });
    const stack = useModalStack();
    const w = mount(SystemHeader, { global: { provide: { engine, [modalStackKey]: stack } } });

    w.get('[data-testid="open-settings"]').element.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0 }),
    );
    expect(stack.stack.value).toHaveLength(1);
    w.unmount();
    engine.dispose();
  });

  it('draws the app name and a subtitle inside the return button', () => {
    const engine = createEngine({
      gameId: 'header-brand-test',
      storageAdapter: createMemoryStorage(),
      timerProvider: idleTimers,
    });
    const w = mount(SystemHeader, {
      props: { appName: 'The Walled Garden', subtitle: 'after dusk' },
      global: { provide: { engine, [modalStackKey]: useModalStack() } },
    });
    const brand = w.get('[data-testid="return-to-slots"]');
    expect(brand.get('.olui-system-header__title').text()).toBe('The Walled Garden');
    expect(brand.get('.olui-system-header__subtitle').text()).toBe('after dusk');
    w.unmount();
    engine.dispose();
  });

  it("shows the game's credits under the About text", async () => {
    const engine = createEngine({
      gameId: 'header-credits-test',
      storageAdapter: createMemoryStorage(),
      timerProvider: idleTimers,
    });
    const w = mount(SystemHeader, {
      props: { credits: [{ what: 'City models', by: 'Kenney', license: 'CC0' }] },
      slots: { about: '<p class="about-text">Rain on the sprawl.</p>' },
      global: { provide: { engine, [modalStackKey]: useModalStack() } },
      attachTo: document.body,
    });
    w.get('[data-testid="open-info"]').element.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0 }),
    );
    await nextTick();
    const about = document.querySelector('.olui-popover__content')!;
    expect(about.querySelector('.about-text')).not.toBeNull();
    expect(about.querySelector('.olui-credit-list__by')?.textContent).toBe('Kenney');
    w.unmount();
    engine.dispose();
  });
});
