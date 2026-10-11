import { describe, it, expect } from 'vitest';
import { defineComponent, h, provide } from 'vue';
import { mount } from '@vue/test-utils';
import { Screen } from '@/types';
import { usePlaySession, type PlaySession } from '../usePlaySession';

/**
 * Records lifecycle calls in order so a test can assert `startGame` /
 * `returnToSlots` drive the engine through the documented sequence. Only the
 * surface `usePlaySession` touches is implemented — the rest of the engine is
 * tested in the engine package; this locks *this layer's* orchestration.
 */
function recordingEngine(loadResult = { success: true, timestamp: 1000 }) {
  const calls: string[] = [];
  const engine = {
    calls,
    activeModId: 'demo',
    mods: [{ id: 'demo', modules: ['m1', 'm2'] }],
    saveManager: {
      selectSlot: (id: number) => calls.push(`selectSlot:${id}`),
      save: () => calls.push('save'),
    },
    selectMod: (id: string) => calls.push(`selectMod:${id}`),
    start: () => calls.push('start'),
    load: () => {
      calls.push('load');
      return loadResult;
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
function withSession(
  engine: ReturnType<typeof recordingEngine>,
  options?: Parameters<typeof usePlaySession>[0],
): PlaySession {
  let session!: PlaySession;
  const Child = defineComponent(() => {
    session = usePlaySession(options);
    return () => h('div');
  });
  mount(
    defineComponent(() => {
      provide('engine', engine);
      return () => h(Child);
    }),
  );
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

    expect(engine.calls).toEqual(['selectSlot:2', 'selectMod:demo', 'start', 'load']);
    expect(session.currentScreen.value).toBe(Screen.Game);
  });

  it('omits selectMod when no mod id is given', () => {
    const engine = recordingEngine();
    withSession(engine).startGame(0);
    expect(engine.calls).toEqual(['selectSlot:0', 'start', 'load']);
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
    // still Slots, so a game's catch-up/first-run work lands before Game shows.
    expect(seen[0].screen).toBe(Screen.Slots);
    expect(engine.calls).toEqual(['selectSlot:0', 'start', 'load']);
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

  it('getActiveModules returns the active mod modules, or empty when none is active', () => {
    const engine = recordingEngine();
    const session = withSession(engine);
    expect(session.getActiveModules()).toEqual(['m1', 'm2']);

    engine.activeModId = null as unknown as string;
    expect(session.getActiveModules()).toEqual([]);
  });
});
