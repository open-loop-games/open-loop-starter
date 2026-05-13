<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Engine } from '@open-loop/engine';
import { useSlots } from '@/composables/useSlots';
import Button from '@/ui/components/Button.vue';
import SlotCard from '@/ui/components/SlotCard.vue';
import ModPicker from '@/ui/components/ModPicker.vue';

const props = defineProps<{
  engine: Engine;
  appName: string;
}>();

const emit = defineEmits<{
  start: [slotId: number, modId?: string];
}>();

const mgr = props.engine.saveManager!;
const { slots, createSlot, deleteSlot, selectSlot, getModName, formatTimestamp, activeSlotId } =
  useSlots(mgr, props.engine.mods);

const hasMods = props.engine.mods.length > 0;

// Only show slots that have actual save data — the engine always creates a
// default slot 0 "Autosave" as a placeholder, but we don't surface it until
// the user has actually saved there.
const savedSlots = computed(() => slots.value.filter((s) => s.peek !== null));

// On first launch (no real saves) with mods, skip the empty slot list and go
// straight to the mod picker.
const showModPicker = ref(savedSlots.value.length === 0 && hasMods);

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
    <h1 class="title">
      {{ props.appName }}
    </h1>

    <div
      v-if="showModPicker"
      class="picker-container"
    >
      <ModPicker
        :mods="engine.mods"
        @select="(modId) => startNewGame(modId)"
      />
      <Button
        class="btn-sm"
        @click="showModPicker = false"
      >
        Back
      </Button>
    </div>

    <div
      v-else
      class="slots-container"
    >
      <div class="slot-list">
        <SlotCard
          v-for="s in savedSlots"
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
        <Button
          class="btn-primary"
          @click="handleNewGame"
        >
          New Game
        </Button>
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
