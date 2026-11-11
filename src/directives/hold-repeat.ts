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
 * A click that no pointer or key press started also fires once: assistive tech
 * and `element.click()` send one. So a press never depends on its input device.
 *
 * The `once` argument (`v-hold-repeat:once`, or a dynamic `:[arg]`) fires once
 * per press and never repeats: for a toggle or a selection, where a held press
 * must not flip the state back and forth.
 */

const DELAY_MS = 400;
const INTERVAL_MS = 60;

/** Receives the press that started it; a repeat passes the same press again. */
type HoldHandler = (e: MouseEvent | KeyboardEvent) => void;

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

  // A pointer or key press fires at once, and the browser may then send a
  // click for the same press. The latch marks that click as already fired. It
  // holds until that click, or until just after the press ends with no click.
  let fired = false;
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;

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

  const latch = () => {
    if (releaseTimer !== null) {
      clearTimeout(releaseTimer);
      releaseTimer = null;
    }
    fired = true;
  };

  // A press's click follows its pointerup or keyup in the same task, so the
  // latch outlives that task and no longer.
  const release = () => {
    if (!fired || releaseTimer !== null) return;
    releaseTimer = setTimeout(() => {
      fired = false;
      releaseTimer = null;
    }, 0);
  };

  const end = () => {
    stop();
    release();
  };

  const onPointerdown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Capture keeps a held press alive when the pointer leaves the element. It
    // throws for a pointer id with no active pointer, which is what a scripted
    // press carries; the press still counts.
    try {
      el.setPointerCapture?.(e.pointerId);
    } catch {
      // No capture: `pointerleave` ends the hold instead.
    }
    latch();
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
    latch();
    handler(e);
  };

  // The one path for a press with no pointer and no key: assistive tech and
  // `element.click()`.
  const onClick = (e: MouseEvent) => {
    if (fired) {
      fired = false;
      return;
    }
    handler(e);
  };

  el.addEventListener('pointerdown', onPointerdown);
  el.addEventListener('click', onClick);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointerleave', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', onKeydown);
  el.addEventListener('keyup', release);
  el.addEventListener('blur', release);

  return {
    setHandler: (nextFn) => {
      handler = nextFn;
    },
    setRepeat: (next) => {
      repeat = next;
    },
    teardown: () => {
      stop();
      if (releaseTimer !== null) clearTimeout(releaseTimer);
      el.removeEventListener('pointerdown', onPointerdown);
      el.removeEventListener('click', onClick);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointerleave', end);
      el.removeEventListener('pointercancel', end);
      el.removeEventListener('keydown', onKeydown);
      el.removeEventListener('keyup', release);
      el.removeEventListener('blur', release);
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
