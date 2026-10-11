import { describe, it, expect } from 'vitest';
import { createSaveManager, createMemoryStorage } from '@open-loop/engine';
import { useSlots } from '../useSlots';

function setup() {
  const mgr = createSaveManager({
    gameId: `use-slots-${Math.random()}`,
    storageAdapter: createMemoryStorage(),
    compressSave: false,
  });
  return { mgr, view: useSlots(mgr, []) };
}

// Each mutation goes through the SaveManager directly, not the composable, so
// these pin the engine's live reads rather than any bookkeeping in useSlots.
describe('useSlots', () => {
  it('lists a slot created on the save manager', () => {
    const { mgr, view } = setup();
    const before = view.slots.value.length;

    const id = mgr.createSlot('Second run');

    expect(view.slots.value).toHaveLength(before + 1);
    expect(view.slots.value.find((s) => s.id === id)?.displayName).toBe('Second run');
  });

  it('shows a rename, and drops a deleted slot', () => {
    const { mgr, view } = setup();
    const id = mgr.createSlot('Before');
    expect(view.slots.value.find((s) => s.id === id)?.displayName).toBe('Before');

    mgr.renameSlot(id, 'After');
    expect(view.slots.value.find((s) => s.id === id)?.displayName).toBe('After');

    mgr.deleteSlot(id);
    expect(view.slots.value.some((s) => s.id === id)).toBe(false);
  });

  it('follows the active slot', () => {
    const { mgr, view } = setup();
    const id = mgr.createSlot();
    expect(view.activeSlotId.value).not.toBe(id);

    mgr.selectSlot(id);
    expect(view.activeSlotId.value).toBe(id);
  });
});
