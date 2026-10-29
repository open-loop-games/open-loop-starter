import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { boot } from '../sim/harness';
import { getTake } from '../modules';
import FloorField from './FloorField.vue';

const rendered: unknown[] = [];
const disposed = vi.fn();
const resized = vi.fn();

// jsdom has no WebGL: the scene is stood in, so the host's own loop and lifecycle are what run.
vi.mock('./floor/floor-scene', () => ({
  FloorScene: class {
    ready = Promise.resolve();
    render(arena: unknown) {
      rendered.push(arena);
    }
    resize = resized;
    stats = () => ({ crowd: 0, drawn: 0, cast: 0, reels: 0, cpuMs: 0 });
    dispose = disposed;
  },
}));

let observe: (() => void) | undefined;
vi.stubGlobal(
  'ResizeObserver',
  class {
    constructor(cb: () => void) {
      observe = cb;
    }
    observe() {}
    disconnect() {}
  },
);

/** Runs queued animation frames by hand, so the host's loop steps when the test says. */
let frames: FrameRequestCallback[] = [];
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
vi.stubGlobal('cancelAnimationFrame', () => (frames = []));
function step(t: number): void {
  const queued = frames;
  frames = [];
  for (const cb of queued) cb(t);
}

let wrapper: VueWrapper | undefined;

describe('the floor host', () => {
  beforeEach(() => {
    boot();
    rendered.length = 0;
    frames = [];
    disposed.mockClear();
    resized.mockClear();
  });
  afterEach(() => wrapper?.unmount());

  it('hands the scene the live arena every animation frame, and nothing between takes', () => {
    wrapper = mount(FloorField, { attachTo: document.body });
    step(16);
    expect(rendered).toEqual([null]);
    getTake().startTake({ star: 'veteran', rating: 0, driver: 'instinct', seed: 1 });
    step(32);
    step(48);
    expect(rendered.slice(1)).toEqual([getTake().arena(), getTake().arena()]);
  });

  it('fits the scene when its box resizes, and disposes it on unmount', () => {
    wrapper = mount(FloorField, { attachTo: document.body });
    observe?.();
    expect(resized).toHaveBeenCalledOnce();
    wrapper.unmount();
    wrapper = undefined;
    expect(disposed).toHaveBeenCalledOnce();
    step(64);
    expect(rendered).toEqual([]);
  });
});
