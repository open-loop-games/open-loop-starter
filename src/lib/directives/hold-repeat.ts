import type { Directive } from 'vue';

/**
 * v-hold-repeat — clicker-game standard: press-and-hold fires the callback
 * once immediately, then repeats at a fixed interval after a short delay.
 * Keyboard activation (Enter/Space) fires once — OS keyrepeat handles holds.
 *
 * Bind the callback directly: `v-hold-repeat="() => doThing()"`. The directive
 * handles pointer/keyboard lifecycle; don't pair with `@click`, which would
 * double-fire on pointer devices.
 */

const DELAY_MS = 400;
const INTERVAL_MS = 60;

interface HoldState {
  teardown: () => void;
}

const stateMap = new WeakMap<HTMLElement, HoldState>();

function attach(el: HTMLElement, fn: () => void): HoldState {
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
    fn();
    delayTimer = setTimeout(() => {
      repeatTimer = setInterval(fn, INTERVAL_MS);
    }, DELAY_MS);
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.repeat) return;
    e.preventDefault();
    fn();
  };

  el.addEventListener('pointerdown', onPointerdown);
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointerleave', stop);
  el.addEventListener('pointercancel', stop);
  el.addEventListener('keydown', onKeydown);

  return {
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

export const vHoldRepeat: Directive<HTMLElement, () => void> = {
  mounted(el, binding) {
    stateMap.set(el, attach(el, binding.value));
  },
  updated(el, binding) {
    if (binding.value === binding.oldValue) return;
    stateMap.get(el)?.teardown();
    stateMap.set(el, attach(el, binding.value));
  },
  unmounted(el) {
    stateMap.get(el)?.teardown();
    stateMap.delete(el);
  },
};
