import { describe, it, expect, afterEach } from 'vitest';
import { createEngine, createMemoryStorage, type Engine } from 'open-loop-engine';
import { createTimeBankModule, TimeBankKey } from '../time-bank';

const noopTimers = {
  setInterval: () => 0 as unknown as ReturnType<typeof globalThis.setInterval>,
  clearInterval: () => {},
};

function boot(namespace: string, rates: number[] = [3, 10, 50]): Engine {
  const engine = createEngine({
    gameId: namespace,
    persistenceNamespace: namespace,
    storageAdapter: createMemoryStorage(),
    timerProvider: noopTimers,
    autoSaveInterval: 0,
  });
  engine.use(createTimeBankModule({ rates }));
  engine.start();
  return engine;
}

describe('time-bank module', () => {
  let engine: Engine | undefined;

  afterEach(() => {
    engine?.stop();
    engine = undefined;
  });

  it('provides state with default rates', () => {
    engine = boot('tb-install');
    const state = engine.tryInject(TimeBankKey);
    expect(state).toBeDefined();
    expect(state!.bankMs.value).toBe(0);
    expect(state!.enabled.value).toBe(false);
    expect(state!.rate.value).toBe(3);
    expect(state!.rates).toEqual([3, 10, 50]);
  });

  it('drains bank per tick when enabled at the selected rate', () => {
    engine = boot('tb-drain');
    const state = engine.tryInject(TimeBankKey)!;
    state.bankMs.value = 10_000;
    state.rate.value = 10;
    state.enabled.value = true;

    // 20Hz → stepOnce dt is 0.05s. With rate=10 the loop would normally scale dt to 0.5s,
    // but stepOnce bypasses speedMultiplier — we still get `dt=0.05` here. The drain
    // formula `dt * 1000 * (rate-1) / rate` yields 0.05 * 1000 * 9/10 = 45 ms per step.
    engine.loop.stepOnce();
    expect(state.bankMs.value).toBeCloseTo(10_000 - 45, 5);

    engine.loop.stepOnce();
    expect(state.bankMs.value).toBeCloseTo(10_000 - 90, 5);
  });

  it('auto-disables when the bank drains to zero', () => {
    engine = boot('tb-drain-zero');
    const state = engine.tryInject(TimeBankKey)!;
    state.bankMs.value = 30;
    state.rate.value = 10;
    state.enabled.value = true;

    engine.loop.stepOnce(); // drains 45 ms → goes negative, clamped to 0, disables.
    expect(state.bankMs.value).toBe(0);
    expect(state.enabled.value).toBe(false);

    // Further ticks are no-ops.
    engine.loop.stepOnce();
    expect(state.bankMs.value).toBe(0);
  });

  it('does not drain when disabled', () => {
    engine = boot('tb-disabled');
    const state = engine.tryInject(TimeBankKey)!;
    state.bankMs.value = 5000;
    // enabled is false by default.
    engine.loop.stepOnce();
    engine.loop.stepOnce();
    expect(state.bankMs.value).toBe(5000);
  });

  it('resets enabled to false on load even if bank survives', () => {
    engine = boot('tb-load');
    const state = engine.tryInject(TimeBankKey)!;
    state.bankMs.value = 5000;
    state.enabled.value = true;
    engine.save();

    state.enabled.value = true;
    engine.load();

    expect(state.enabled.value).toBe(false);
    expect(state.bankMs.value).toBe(5000);
  });

  it('persists bankMs and rate across save/load', () => {
    engine = boot('tb-persist');
    const state = engine.tryInject(TimeBankKey)!;
    state.bankMs.value = 123_456;
    state.rate.value = 50;
    engine.save();

    state.bankMs.value = 0;
    state.rate.value = 3;
    engine.load();

    expect(state.bankMs.value).toBe(123_456);
    expect(state.rate.value).toBe(50);
  });

  it('respects a custom rates config', () => {
    engine = boot('tb-rates', [2, 5, 20]);
    const state = engine.tryInject(TimeBankKey)!;
    expect(state.rates).toEqual([2, 5, 20]);
    expect(state.rate.value).toBe(2);
  });
});
