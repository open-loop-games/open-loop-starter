import { describe, it, expect } from 'vitest';
import type { EngineModule, InjectionKey } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { createModuleApi } from '../module-api';

interface CounterApi {
  label: string;
}

const CounterKey: InjectionKey<CounterApi> = Symbol('test/counter') as InjectionKey<CounterApi>;

function bootCounter(published: ReturnType<typeof createModuleApi<CounterApi>>, label: string) {
  const mod: EngineModule = {
    id: 'test/counter',
    install(ctx) {
      published.publish(ctx, { label });
    },
  };
  return bootTestEngine({ modules: [mod] });
}

describe('createModuleApi', () => {
  it('throws a named error when read before any engine installs the module', () => {
    const counter = createModuleApi(CounterKey);
    expect(() => counter.get()).toThrow(/test\/counter/);
  });

  it('publishes on both surfaces', () => {
    const counter = createModuleApi(CounterKey);
    const { engine } = bootCounter(counter, 'live');
    expect(counter.get().label).toBe('live');
    expect(engine.tryInject(CounterKey)).toBe(counter.get());
  });

  it('returns to the earlier engine when a later one is disposed', () => {
    // The balance workbench boots headless engines over the live game's
    // modules in the same page; disposing one must not strand the getter.
    const counter = createModuleApi(CounterKey);
    bootCounter(counter, 'live');
    const { engine: headless } = bootCounter(counter, 'headless');
    expect(counter.get().label).toBe('headless');

    headless.dispose();
    expect(counter.get().label).toBe('live');
  });

  it('throws again once every engine is disposed', () => {
    const counter = createModuleApi(CounterKey);
    const { engine } = bootCounter(counter, 'live');
    engine.dispose();
    expect(() => counter.get()).toThrow(/test\/counter/);
  });
});
