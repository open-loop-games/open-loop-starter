import type { Directive } from 'vue';

/**
 * v-hold-repeat — clicker-game standard: press-and-hold fires the handler
 * once immediately, then repeats at a fixed interval after a short delay.
 * Keyboard activation (Enter/Space) fires once — OS keyrepeat handles holds.
 *
 * Bind the handler directly: `v-hold-repeat="(e) => doThing(e)"`; it receives the press. The directive
 * handles pointer/keyboard lifecycle; don't pair with `@click`, which would
 * double-fire on pointer devices.
 *
 * The `once` argument (`v-hold-repeat:once`, or a dynamic `:[arg]`) fires once
 * per press and never repeats: for a toggle or a selection, where a held press
 * must not flip the state back and forth.
 */

const DELAY_MS = 400;
const INTERVAL_MS = 60;

/** Receives the press that started it; a repeat passes the same press again. */
type HoldHandler = (e: PointerEvent | KeyboardEvent) => void;

interface HoldState {
  setHandler: (fn: HoldHandler) => void;
  setRepeat: (repeat: boolean) => void;
  teardown: () => void;
}

const stateMap = new WeakMap<HTMLElement, HoldState>();

function attach(el: HTMLElement, fn: HoldHandler, initialRepeat: boolean): HoldState {
  let handler = fn;
  let repeat = initialRepeat;
  let delayTimer: ReturnType<typeof setTimeout> | null = null;
  let repeatTimer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (delayTimer !== null) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    if (repeatTimer !== null) {
      clearInterval(repeatTimer);
      repeatTimer = null;
    }
  };

  const onPointerdown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    el.setPointerCapture?.(e.pointerId);
    handler(e);
    if (!repeat) return;
    delayTimer = setTimeout(() => {
      repeatTimer = setInterval(() => {
        handler(e);
      }, INTERVAL_MS);
    }, DELAY_MS);
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.repeat) return;
    e.preventDefault();
    handler(e);
  };

  el.addEventListener('pointerdown', onPointerdown);
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointerleave', stop);
  el.addEventListener('pointercancel', stop);
  el.addEventListener('keydown', onKeydown);

  return {
    setHandler: (nextFn) => {
      handler = nextFn;
    },
    setRepeat: (next) => {
      repeat = next;
    },
    teardown: () => {
      stop();
      el.removeEventListener('pointerdown', onPointerdown);
      el.removeEventListener('pointerup', stop);
      el.removeEventListener('pointerleave', stop);
      el.removeEventListener('pointercancel', stop);
      el.removeEventListener('keydown', onKeydown);
    },
  };
}

export const vHoldRepeat: Directive<HTMLElement, HoldHandler> = {
  mounted(el, binding) {
    stateMap.set(el, attach(el, binding.value, binding.arg !== 'once'));
  },
  updated(el, binding) {
    const state = stateMap.get(el);
    state?.setHandler(binding.value);
    state?.setRepeat(binding.arg !== 'once');
  },
  unmounted(el) {
    stateMap.get(el)?.teardown();
    stateMap.delete(el);
  },
};
