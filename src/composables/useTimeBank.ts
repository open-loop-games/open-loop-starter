import { watch } from 'vue';
import { formatTime, type Engine } from 'open-loop-engine';
import { TimeBankKey, type TimeBankState } from '@/modules/time-bank';
import { useToasts } from './useToasts';

export interface TimeBankHandle extends TimeBankState {
  /** Add ms to the bank. Also fires a toast when the grant is meaningful (> 5s). */
  grant: (ms: number) => void;
  /** Flip speed-up on/off. No-op when turning on if bank is empty. */
  toggle: () => void;
  /** Set the active rate. Must be a value from `rates`. */
  setRate: (r: number) => void;
}

/**
 * Wires the time-bank module's reactive state to `engine.loop`:
 * - watches `enabled` + `rate` and sets `loop.speedMultiplier` live
 * - routes `loop.onDeltaOverflow` into the bank (tab-hide / hitch → banked)
 * - exposes `grant`, `toggle`, `setRate` for UI
 *
 * Returns `undefined` when the time-bank module isn't registered, letting callers
 * (drawer, App.vue) render/skip cleanly on games that opt out.
 */
export function useTimeBank(engine: Engine): TimeBankHandle | undefined {
  const state = engine.tryInject(TimeBankKey);
  if (!state) return undefined;

  const { addToast } = useToasts();

  watch(
    [() => state.enabled.value, () => state.rate.value],
    ([enabled, rate]) => {
      engine.loop.speedMultiplier = enabled ? rate : 1;
    },
    { immediate: true },
  );

  const grant = (ms: number): void => {
    if (ms <= 0) return;
    state.bankMs.value += ms;
    if (ms >= 5000) {
      addToast('Bonus time', '+' + formatTime(ms / 1000), 2500);
    }
  };

  const toggle = (): void => {
    if (state.enabled.value) {
      state.enabled.value = false;
    } else if (state.bankMs.value > 1000) {
      state.enabled.value = true;
    }
  };

  const setRate = (r: number): void => {
    if (!state.rates.includes(r)) return;
    state.rate.value = r;
  };

  engine.loop.onDeltaOverflow = (droppedSeconds) => {
    grant(droppedSeconds * 1000);
  };

  return { ...state, grant, toggle, setRate };
}
