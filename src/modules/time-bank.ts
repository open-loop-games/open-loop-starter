import { ref, type Ref } from 'vue';
import {
  persistent,
  type Persistent,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
} from 'open-loop-engine';

/**
 * Time bank: offline and overflow wall time is banked as ms, spendable as a player-opt
 * speed-up. Pattern validated by Kill The Lich (stopsign-games/KTL): 1:1 exchange rate,
 * rate-laddered speed multiplier, session always begins at 1x.
 *
 * State shape is reactive and minimal; the wiring (loop.speedMultiplier, offline
 * crediting, overflow callbacks, toast feedback) lives in `useTimeBank()` which has
 * engine access. Modules can't reach `engine.loop` themselves.
 */
export interface TimeBankState {
  /** Banked wall time in milliseconds. Plain number — ms never overflows a lifetime. */
  bankMs: Persistent<number>;
  /** Speed-up toggle. Not persistent — sessions always begin at 1x. */
  enabled: Ref<boolean>;
  /** Selected rate from `rates`. Persisted so the player's ladder choice survives. */
  rate: Persistent<number>;
  /** Configurable rate ladder (e.g. [3, 10, 50]). Non-persistent config. */
  rates: readonly number[];
}

export interface TimeBankConfig {
  /** Rate ladder, default `[3, 10, 50]`. Must contain at least one value > 1. */
  rates?: readonly number[];
  /** Initial rate (default: first entry of `rates`). */
  initialRate?: number;
}

export const TimeBankKey: InjectionKey<TimeBankState> = Symbol(
  'time-bank',
) as InjectionKey<TimeBankState>;

export function createTimeBankModule(config: TimeBankConfig = {}): EngineModule {
  const rates = config.rates ?? [3, 10, 50];
  const initialRate = config.initialRate ?? rates[0];
  return {
    id: 'time-bank',
    install(ctx: EngineContext) {
      const bankMs = persistent(0, { name: 'bankMs' });
      const rate = persistent(initialRate, { name: 'rate' });
      const enabled = ref(false);

      ctx.provide(TimeBankKey, { bankMs, enabled, rate, rates });

      // Drain while enabled. `dt` is game time (already multiplied by loop.speedMultiplier),
      // so the wall-time drain per tick is `dt - dt/rate` game-ms-equivalent, which equals
      // real wall time × (rate - 1). We charge that to the bank.
      ctx.onTick((dt) => {
        if (!enabled.value) return;
        if (bankMs.value <= 0) {
          enabled.value = false;
          return;
        }
        const drain = (dt * 1000 * (rate.value - 1)) / rate.value;
        bankMs.value -= drain;
        if (bankMs.value <= 0) {
          bankMs.value = 0;
          enabled.value = false;
        }
      });

      // Sessions always begin at 1x — matches KTL invariant that loads never surprise the
      // player with a running bonus-speed.
      ctx.onLoad(() => {
        enabled.value = false;
      });
    },
  };
}
