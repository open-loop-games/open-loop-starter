import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import type { EngineModule } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { useDevHandle, type DevHandleOptions } from '../useDevHandle';

interface Handle {
  engine: unknown;
  skip(seconds: number): void;
  [key: string]: unknown;
}
const handle = () => (window as unknown as { __game?: Handle }).__game;

function mountWithHandle(api: Record<string, unknown>, options?: DevHandleOptions) {
  let elapsed = 0;
  const clock: EngineModule = {
    id: 'test/clock',
    install(ctx) {
      ctx.onTick((dt) => {
        elapsed += dt;
      });
    },
  };
  const { engine } = bootTestEngine({ modules: [clock], intervalRate: 1 });
  const View = defineComponent({
    setup() {
      useDevHandle(api, options);
      return () => h('div');
    },
  });
  const wrapper = mount(View, { global: { provide: { engine } } });
  return { engine, wrapper, elapsed: () => elapsed };
}

afterEach(() => {
  delete (window as unknown as { __game?: Handle }).__game;
});

describe('useDevHandle', () => {
  it('publishes the engine and the api record on window.__game', () => {
    const board = { cells: 3 };
    const { engine } = mountWithHandle({ board });
    expect(handle()!.engine).toBe(engine);
    expect(handle()!.board).toBe(board);
  });

  it('skips game time in chunks, running the step after each', () => {
    let steps = 0;
    const { elapsed } = mountWithHandle({}, { chunk: 2, step: () => steps++ });
    handle()!.skip(7);
    expect(elapsed()).toBeCloseTo(7);
    expect(steps).toBe(4); // 2 + 2 + 2 + 1
  });

  it('removes the handle on unmount', () => {
    const { wrapper } = mountWithHandle({});
    wrapper.unmount();
    expect(handle()).toBeUndefined();
  });
});
