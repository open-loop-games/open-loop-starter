import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSaveManager,
  createMemoryStorage,
  withPersistentContext,
  persistent,
  type Persistent,
} from '@open-loop/engine';
import { useSaveEvents } from '../useSaveEvents';
import { useToasts } from '../useToasts';

describe('useSaveEvents', () => {
  beforeEach(() => {
    // Toast composable uses module-singleton state; clear between tests.
    const { toasts } = useToasts();
    toasts.value.splice(0, toasts.value.length);
  });

  it('aggregates per-load validation issues into a single toast', () => {
    const storage = createMemoryStorage();
    const mgr = createSaveManager({
      gameId: 'aggregation-test',
      storageAdapter: storage,
      strictValidation: false,
      compressSave: false,
    });
    const refs = withPersistentContext('ctx', () => ({
      a: persistent(0, { id: 'a' }) as Persistent<number>,
      b: persistent(0, { id: 'b' }) as Persistent<number>,
    }));
    refs.a.value = 1;
    refs.b.value = 2;
    mgr.save();

    // Corrupt both leaves so two save:validation-failed events fire per load.
    const raw = JSON.parse(storage.getItem('aggregation-test-slot-0')!);
    raw.data['ctx'].a = { not: 'a number' };
    raw.data['ctx'].b = { not: 'a number' };
    storage.setItem('aggregation-test-slot-0', JSON.stringify(raw));

    useSaveEvents(mgr);
    const { toasts } = useToasts();
    expect(toasts.value).toHaveLength(0);

    const result = mgr.load();
    expect(result.success).toBe(true);

    // One aggregated toast for the two self-healed fields, not two per-field toasts.
    expect(toasts.value).toHaveLength(1);
    expect(toasts.value[0].title).toBe('Save auto-repaired');
    expect(toasts.value[0].content).toContain('2 fields');
  });

  it('emits no toast when load is clean', () => {
    const storage = createMemoryStorage();
    const mgr = createSaveManager({
      gameId: 'clean-load',
      storageAdapter: storage,
      strictValidation: false,
      compressSave: false,
    });
    const x = withPersistentContext('ctx2', () => persistent(0, { id: 'x' }) as Persistent<number>);
    x.value = 42;
    mgr.save();

    useSaveEvents(mgr);
    mgr.load();

    const { toasts } = useToasts();
    expect(toasts.value).toHaveLength(0);
  });

  it('shows load-failed with a human-readable reason', () => {
    const storage = createMemoryStorage();
    const mgr = createSaveManager({
      gameId: 'fail-load',
      storageAdapter: storage,
    });
    storage.setItem('fail-load-slot-0', 'not-valid-json{{{');

    useSaveEvents(mgr);
    mgr.load();

    const { toasts } = useToasts();
    expect(toasts.value).toHaveLength(1);
    expect(toasts.value[0].title).toBe('Save load failed');
    expect(toasts.value[0].content).toContain('malformed');
  });

  it('says on the load-failed toast that the slot is kept from later saves', () => {
    const storage = createMemoryStorage();
    const mgr = createSaveManager({ gameId: 'protect-load', storageAdapter: storage });
    storage.setItem('protect-load-slot-0', 'not-valid-json{{{');

    useSaveEvents(mgr);
    mgr.load();

    // One toast for the one failure, carrying both what failed and what the
    // save manager did about it.
    const { toasts } = useToasts();
    expect(mgr.isSlotProtected(0)).toBe(true);
    expect(toasts.value).toHaveLength(1);
    expect(toasts.value[0].title).toBe('Save load failed');
    expect(toasts.value[0].content).toContain('malformed');
    expect(toasts.value[0].content).toContain('paused');
  });

  it('unsubscribe removes every handler', () => {
    const storage = createMemoryStorage();
    const mgr = createSaveManager({ gameId: 'unsub-test', storageAdapter: storage });
    storage.setItem('unsub-test-slot-0', 'corrupt{{');

    const unsub = useSaveEvents(mgr);
    unsub();
    mgr.load();

    const { toasts } = useToasts();
    expect(toasts.value).toHaveLength(0);
  });
});
