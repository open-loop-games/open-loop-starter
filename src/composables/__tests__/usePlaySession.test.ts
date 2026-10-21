import { afterEach, describe, it, expect } from 'vitest';
import { defineComponent, h, provide } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { Screen } from '@/types';
import { usePlaySession, type PlaySession } from '../usePlaySession';

/**
 * Records lifecycle calls in order so a test can assert `startGame` /
 * `returnToSlots` drive the engine through the documented sequence. Only the
 * engine API `usePlaySession` touches is implemented — the rest of the engine is
 * tested in the engine package; this locks *this layer's* orchestration.
 */
function recordingEngine(
  loadResult: { success: boolean; timestamp?: number } = { success: true, timestamp: 1000 },
) {
  const calls: string[] = [];
  const engine = {
    calls,
    loadResult,
    activeModId: undefined as string | undefined,
    autoSaveInterval: 30_000,
    mods: [{ id: 'demo', modules: ['m1', 'm2'] }],
    saveManager: {
      selectSlot: (id: number) => calls.push(`selectSlot:${id}`),
      save: () => calls.push('save'),
      exportSave: () => {
        calls.push('exportSave');
        return 'defaults';
      },
      importSave: (text: string) => calls.push(`importSave:${text}`),
    },
    selectMod: (id: string) => {
      calls.push(`selectMod:${id}`);
      engine.activeModId = id;
    },
    start: () => calls.push('start'),
    load: () => {
      calls.push('load');
      return engine.loadResult;
    },
    stop: () => calls.push('stop'),
  };
  return engine;
}

/**
 * Mount a parent that provides the engine and a child that runs the composable
 * — `inject` reads *parent* provides, so provide and inject can't share one
 * component.
 */
const mounted: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

function withSession(
  engine: ReturnType<typeof recordingEngine>,
  options?: Parameters<typeof usePlaySession>[0],
): PlaySession {
  let session!: PlaySession;
  const Child = defineComponent(() => {
    session = usePlaySession(options);
    return () => h('div');
  });
  const wrapper = mount(
    defineComponent(() => {
      provide('engine', engine);
      return () => h(Child);
    }),
  );
  mounted.push(wrapper);
  return session;
}

describe('usePlaySession', () => {
  it('starts on the slot picker', () => {
    const session = withSession(recordingEngine());
    expect(session.currentScreen.value).toBe(Screen.Slots);
  });

  it('startGame drives the engine through select → start → load, then shows the game', () => {
    const engine = recordingEngine();
    const session = withSession(engine);

    session.startGame(2, 'demo');

    expect(engine.calls).toEqual(['selectSlot:2', 'selectMod:demo', 'start', 'exportSave', 'load']);
    expect(session.currentScreen.value).toBe(Screen.Game);
  });

  it('a later session resumes the selected mod rather than selecting it again', () => {
    const engine = recordingEngine();
    const session = withSession(engine);
    session.startGame(2, 'demo');
    session.returnToSlots();
    engine.calls.length = 0;

    session.startGame(2, 'demo');

    expect(engine.calls).toEqual(['selectSlot:2', 'start', 'load']);
  });

  it('a later slot that loads nothing starts from the defaults, not the last game', () => {
    const engine = recordingEngine();
    const session = withSession(engine);
    session.startGame(0, 'demo');
    session.returnToSlots();
    engine.calls.length = 0;
    engine.loadResult = { success: false };

    session.startGame(1, 'demo');

    expect(engine.calls).toEqual(['selectSlot:1', 'start', 'load', 'importSave:defaults']);
  });

  it('a first slot that loads nothing is already at the defaults', () => {
    const engine = recordingEngine({ success: false });
    withSession(engine).startGame(0, 'demo');
    expect(engine.calls).not.toContain('importSave:defaults');
  });

  it('omits selectMod when no mod id is given', () => {
    const engine = recordingEngine();
    withSession(engine).startGame(0);
    expect(engine.calls).toEqual(['selectSlot:0', 'start', 'exportSave', 'load']);
  });

  it('fires onLoaded with the load result, after load and before the screen flip', () => {
    const engine = recordingEngine({ success: true, timestamp: 4242 });
    const seen: Array<{ result: unknown; screen: Screen }> = [];
    const session = withSession(engine, {
      onLoaded: (result) => seen.push({ result, screen: session.currentScreen.value }),
    });

    session.startGame(0);

    expect(seen).toHaveLength(1);
    expect(seen[0].result).toEqual({ success: true, timestamp: 4242 });
    // The seam the archetype tails depend on: onLoaded runs while the screen is
    // still Slots, so a game's catch-up/first-launch work finishes before Game shows.
    expect(seen[0].screen).toBe(Screen.Slots);
    expect(engine.calls).toEqual(['selectSlot:0', 'start', 'exportSave', 'load']);
  });

  it('returnToSlots saves, stops, and returns to the picker', () => {
    const engine = recordingEngine();
    const session = withSession(engine);
    session.startGame(0);
    engine.calls.length = 0;

    session.returnToSlots();

    expect(engine.calls).toEqual(['save', 'stop']);
    expect(session.currentScreen.value).toBe(Screen.Slots);
  });

  describe('saves when the page is hidden', () => {
    it('saves a live game when the page goes away', () => {
      const engine = recordingEngine();
      withSession(engine).startGame(0);
      engine.calls.length = 0;

      window.dispatchEvent(new Event('pagehide'));

      expect(engine.calls).toEqual(['save']);
    });

    it('writes nothing from the slot picker, where no game is loaded', () => {
      const engine = recordingEngine();
      const session = withSession(engine);
      window.dispatchEvent(new Event('pagehide'));
      expect(engine.calls).toEqual([]);

      session.startGame(0);
      session.returnToSlots();
      engine.calls.length = 0;
      window.dispatchEvent(new Event('pagehide'));
      expect(engine.calls).toEqual([]);
    });

    it('writes nothing while the player has autosave off', () => {
      const engine = recordingEngine();
      withSession(engine).startGame(0);
      engine.autoSaveInterval = 0;
      engine.calls.length = 0;

      window.dispatchEvent(new Event('pagehide'));

      expect(engine.calls).toEqual([]);
    });

    it('saves when the tab is hidden, and not when it shows again', () => {
      const engine = recordingEngine();
      withSession(engine).startGame(0);
      engine.calls.length = 0;
      const changeVisibility = (state: DocumentVisibilityState) => {
        Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      };

      changeVisibility('hidden');
      changeVisibility('visible');
      Reflect.deleteProperty(document, 'visibilityState');

      expect(engine.calls).toEqual(['save']);
    });

    it('stops listening once the session unmounts', () => {
      const engine = recordingEngine();
      withSession(engine).startGame(0);
      engine.calls.length = 0;

      mounted.pop()!.unmount();
      window.dispatchEvent(new Event('pagehide'));

      expect(engine.calls).toEqual([]);
    });
  });
});
