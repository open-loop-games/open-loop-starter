/**
 * Sandbox wrapper invariants: `body[data-archetype]` is set on entry and
 * cleared on exit, transitioning between archetypes leaves no residue,
 * and the underlying engine is stopped + Vue app unmounted between demos.
 *
 * Stubs out the archetype boots — the wrapper protocol is the unit under
 * test, not any real archetype.
 */
/* eslint-disable vue/one-component-per-file -- fake archetype roots are test fixtures, not production components */
import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import { createApp as createVueApp } from 'vue';
import SandboxWrapper from '../SandboxWrapper.vue';
import type { ArchetypeBootResult, SandboxArchetype } from '../types';

interface FakeEngineHandles {
  stopped: boolean;
  disposed: boolean;
}

function makeFakeBoot(id: string): {
  boot: () => Promise<ArchetypeBootResult>;
  handles: FakeEngineHandles;
} {
  const handles: FakeEngineHandles = { stopped: false, disposed: false };
  return {
    handles,
    boot: async () => {
      const stopFn = (): void => {
        handles.stopped = true;
      };
      const disposeFn = (): void => {
        handles.disposed = true;
        handles.stopped = true;
      };
      const FakeRoot = defineComponent({
        setup() {
          return () => h('div', { class: `fake-root-${id}` }, `archetype: ${id}`);
        },
      });
      const innerApp = createVueApp(FakeRoot);
      const result: ArchetypeBootResult = {
        engine: { stop: stopFn, dispose: disposeFn } as unknown as ArchetypeBootResult['engine'],
        app: innerApp,
        mount: (target) => {
          const el = typeof target === 'string' ? document.querySelector(target) : target;
          innerApp.mount(el as Element);
        },
      };
      return result;
    },
  };
}

describe('SandboxWrapper', () => {
  it('sets body[data-archetype] on mount and disposes engine on unmount', async () => {
    const archetype = ref<SandboxArchetype>({ id: 'fakeA' });
    const { boot, handles } = makeFakeBoot('fakeA');

    const Host = defineComponent({
      setup() {
        return () =>
          h(SandboxWrapper, {
            archetype: archetype.value,
            boot,
          });
      },
    });

    const wrapper = mount(Host);
    await flushPromises();
    expect(document.body.dataset.archetype).toBe('fakeA');
    expect(handles.disposed).toBe(false);

    wrapper.unmount();
    await nextTick();
    expect(document.body.dataset.archetype).toBeUndefined();
    expect(handles.disposed).toBe(true);
  });

  it('clears the previous archetype dataset before mounting the next', async () => {
    const archetype = ref<SandboxArchetype>({ id: 'fakeA' });
    const bootA = makeFakeBoot('fakeA');
    const bootB = makeFakeBoot('fakeB');

    let activeBoot = bootA.boot;

    const Host = defineComponent({
      setup() {
        return () =>
          h(SandboxWrapper, {
            archetype: archetype.value,
            boot: () => activeBoot(),
          });
      },
    });

    const wrapper = mount(Host);
    await flushPromises();
    expect(document.body.dataset.archetype).toBe('fakeA');

    activeBoot = bootB.boot;
    archetype.value = { id: 'fakeB' };
    await flushPromises();
    await nextTick();

    expect(document.body.dataset.archetype).toBe('fakeB');
    expect(bootA.handles.disposed).toBe(true);
    expect(bootB.handles.disposed).toBe(false);

    wrapper.unmount();
    await nextTick();
    expect(document.body.dataset.archetype).toBeUndefined();
    expect(bootB.handles.disposed).toBe(true);
  });

  it('disposes the engine between back-to-back wrapper instances for the same archetype', async () => {
    // Gallery remount path: enter archetype, exit (SandboxWrapper unmounts
    // entirely via v-if on `entered`), enter same archetype (a fresh
    // SandboxWrapper instance mounts). Without dispose, the second mount's
    // engine.start() hits a persistent-name collision because the first
    // engine's module ids still own the persistent contexts.
    const archetype: SandboxArchetype = { id: 'remountA' };
    const bootA = makeFakeBoot('remountA');
    const bootB = makeFakeBoot('remountA');

    const HostFactory = (
      boot: () => Promise<ArchetypeBootResult>,
    ): ReturnType<typeof defineComponent> =>
      defineComponent({
        setup: () => () => h(SandboxWrapper, { archetype, boot }),
      });

    const first = mount(HostFactory(bootA.boot));
    await flushPromises();
    expect(document.body.dataset.archetype).toBe('remountA');
    first.unmount();
    await nextTick();
    expect(bootA.handles.disposed).toBe(true);

    const second = mount(HostFactory(bootB.boot));
    await flushPromises();
    expect(document.body.dataset.archetype).toBe('remountA');
    second.unmount();
    await nextTick();
    expect(bootB.handles.disposed).toBe(true);
  });

  it('surfaces boot errors via the error event without leaving residue', async () => {
    const archetype = ref<SandboxArchetype>({ id: 'broken' });
    const onError = vi.fn();

    const Host = defineComponent({
      setup() {
        return () =>
          h(SandboxWrapper, {
            archetype: archetype.value,
            boot: async () => {
              throw new Error('boot failed');
            },
            onError,
          });
      },
    });

    const wrapper = mount(Host);
    await flushPromises();

    expect(onError).toHaveBeenCalledOnce();
    expect(document.body.dataset.archetype).toBeUndefined();

    wrapper.unmount();
  });
});
