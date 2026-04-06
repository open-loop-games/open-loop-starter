<script setup lang="ts">
import { ref } from 'vue';
import type { Engine } from 'open-loop-engine';
import { useSlots } from '@/composables/useSlots';
import SlotCard from '@/ui/components/SlotCard.vue';
import ModPicker from '@/ui/components/ModPicker.vue';

const props = defineProps<{
  engine: Engine;
}>();

const emit = defineEmits<{
  start: [slotId: number, modId?: string];
}>();

const mgr = props.engine.saveManager!;
const { slots, createSlot, deleteSlot, selectSlot, getModName, formatTimestamp, activeSlotId } =
  useSlots(mgr, props.engine.mods);

const showModPicker = ref(false);
const hasMods = props.engine.mods.length > 0;

function loadSlot(slotId: number) {
  selectSlot(slotId);
  const peek = mgr.peekSlot(slotId);
  emit('start', slotId, peek?.modId);
}

function startNewGame(modId?: string) {
  const id = createSlot();
  selectSlot(id);
  emit('start', id, modId);
}

function handleNewGame() {
  if (hasMods) {
    showModPicker.value = true;
  } else {
    startNewGame();
  }
}

function handleDeleteSlot(slotId: number) {
  if (slotId === activeSlotId.value) return;
  if (confirm(`Delete "${mgr.slots.find((s) => s.id === slotId)?.name}"?`)) {
    deleteSlot(slotId);
  }
}
</script>

<template>
  <div class="slot-screen">
    <h1 class="title">Open Loop Starter</h1>

    <div v-if="showModPicker" class="picker-container">
      <ModPicker :mods="engine.mods" @select="(modId) => startNewGame(modId)" />
      <button class="btn-sm" @click="showModPicker = false">Back</button>
    </div>

    <div v-else class="slots-container">
      <div class="slot-list">
        <SlotCard
          v-for="s in slots"
          :key="s.id"
          :info="s"
          :active="s.id === activeSlotId"
          :mod-name="getModName(s.peek?.modId)"
          :time-ago="formatTimestamp(s.peek?.timestamp)"
          @load="loadSlot(s.id)"
          @delete="handleDeleteSlot(s.id)"
        />
      </div>

      <div class="slot-actions">
        <button class="btn-primary" @click="handleNewGame">New Game</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slot-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--gap-lg);
  gap: var(--gap-lg);
}

.title {
  font-size: 1.8em;
  color: var(--color-primary);
}

.slots-container,
.picker-container {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}

.slot-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.slot-actions {
  display: flex;
  justify-content: center;
}
</style>
