import { computed } from 'vue';
import type { SaveManager, SaveSlot, SavePeek, ModDef } from '@open-loop/engine';

export interface SlotInfo extends SaveSlot {
  peek: SavePeek | null;
}

/**
 * Slot-screen view over a SaveManager. `slots` and `activeSlotId` are live
 * engine reads; `peek` is read whenever the slot list changes, which covers
 * every save the screen can see — it mounts only after the session has saved
 * and stopped the engine.
 */
export function useSlots(saveManager: SaveManager, mods: readonly ModDef[]) {
  const slots = computed<SlotInfo[]>(() =>
    saveManager.slots.map((slot) => ({
      ...slot,
      peek: saveManager.peekSlot(slot.id),
    })),
  );

  function createSlot(name?: string): number {
    return saveManager.createSlot(name);
  }

  function deleteSlot(slotId: number) {
    saveManager.deleteSlot(slotId);
  }

  function renameSlot(slotId: number, name: string) {
    saveManager.renameSlot(slotId, name);
  }

  function selectSlot(slotId: number) {
    saveManager.selectSlot(slotId);
  }

  function getModName(modId?: string): string | undefined {
    if (!modId) return undefined;
    return mods.find((m) => m.id === modId)?.displayName;
  }

  function formatTimestamp(ts?: number): string {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return {
    slots,
    createSlot,
    deleteSlot,
    renameSlot,
    selectSlot,
    getModName,
    formatTimestamp,
    activeSlotId: computed(() => saveManager.activeSlotId),
  };
}
