import { ref, computed, type Ref } from 'vue';
import type { SaveManager, SaveSlot, SavePeek, ModDef } from '@open-loop/engine';

export interface SlotInfo extends SaveSlot {
  peek: SavePeek | null;
}

export function useSlots(saveManager: SaveManager, mods: readonly ModDef[]) {
  // Reactive trigger for slot list updates
  const revision = ref(0);

  const slots = computed<SlotInfo[]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    revision.value; // track
    return saveManager.slots.map((slot) => ({
      ...slot,
      peek: saveManager.peekSlot(slot.id),
    }));
  });

  function createSlot(name?: string): number {
    const id = saveManager.createSlot(name);
    revision.value++;
    return id;
  }

  function deleteSlot(slotId: number) {
    saveManager.deleteSlot(slotId);
    revision.value++;
  }

  function renameSlot(slotId: number, name: string) {
    saveManager.renameSlot(slotId, name);
    revision.value++;
  }

  function selectSlot(slotId: number) {
    saveManager.selectSlot(slotId);
    revision.value++;
  }

  function getModName(modId?: string): string | undefined {
    if (!modId) return undefined;
    return mods.find((m) => m.id === modId)?.name;
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
    activeSlotId: computed(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      revision.value;
      return saveManager.activeSlotId;
    }) as Ref<number>,
  };
}
