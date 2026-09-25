import { describe, it, expect, beforeEach } from 'vitest';
import { defineComponent, h, provide } from 'vue';
import { mount } from '@vue/test-utils';
import { createEngine, type Engine } from '@open-loop/engine';
import { settingsModule, SettingsKey } from '@/modules/settings';
import { useSave } from '../useSave';
import { useToasts } from '../useToasts';

let bootCounter = 0;
/** The last booted engine's storage, readable by key. */
let storage: Map<string, string>;

function bootEngine(): Engine {
  const namespace = `use-save-${bootCounter++}`;
  storage = new Map();
  const engine = createEngine({
    gameId: namespace,
    persistence: true,
    persistenceNamespace: namespace,
    storageAdapter: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => void storage.set(key, value),
      removeItem: (key) => void storage.delete(key),
    },
  });
  engine.use(settingsModule);
  engine.start();
  engine.stop();
  return engine;
}

/** `inject` reads parent provides, so the engine is provided one level up. */
function withSave(engine: Engine): ReturnType<typeof useSave> {
  let api!: ReturnType<typeof useSave>;
  const Child = defineComponent(() => {
    api = useSave();
    return () => h('div');
  });
  mount(
    defineComponent(() => {
      provide('engine', engine);
      return () => h(Child);
    }),
  );
  return api;
}

// The "Saved" announcement is the settings module's, keyed off `save:written`;
// these drive it through `useSave`, the surface the save panel uses.
describe('useSave', () => {
  beforeEach(() => {
    const { toasts } = useToasts();
    toasts.value.splice(0, toasts.value.length);
  });

  it('announces a save and stamps when it happened', () => {
    const engine = bootEngine();
    withSave(engine).save();

    const { toasts } = useToasts();
    expect(toasts.value.map((t) => t.title)).toEqual(['Saved']);
    expect(engine.tryInject(SettingsKey)!.lastSaveTimestamp.value).toBeGreaterThan(0);
  });

  it('announces a write made straight through the save manager, as autosave does', () => {
    const engine = bootEngine();
    engine.saveManager!.save();

    const { toasts } = useToasts();
    expect(toasts.value.map((t) => t.title)).toEqual(['Saved']);
    expect(engine.tryInject(SettingsKey)!.lastSaveTimestamp.value).toBe(
      engine.saveManager!.peek()!.timestamp,
    );
  });

  it('announces nothing when a failed load has protected the slot', () => {
    const engine = bootEngine();
    const mgr = engine.saveManager!;
    mgr.save();
    const slotKey = [...storage.keys()].find((k) => k.endsWith(`-slot-${mgr.activeSlotId}`))!;
    storage.set(slotKey, 'not-valid-json{{{');
    engine.load();
    const { toasts } = useToasts();
    toasts.value.splice(0, toasts.value.length);

    withSave(engine).save();

    expect(toasts.value).toHaveLength(0);
    expect(storage.get(slotKey)).toBe('not-valid-json{{{');
  });

  it('announces nothing for an export, which writes no save', () => {
    const engine = bootEngine();
    withSave(engine).exportSave();

    const { toasts } = useToasts();
    expect(toasts.value).toHaveLength(0);
    expect(engine.tryInject(SettingsKey)!.lastSaveTimestamp.value).toBe(0);
  });
});
