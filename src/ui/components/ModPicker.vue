<script setup lang="ts">
import { ref } from 'vue';
import type { ModDef } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';

const props = defineProps<{ mods: readonly ModDef[] }>();
const emit = defineEmits<{ select: [modId: string] }>();

const selected = ref<string | null>(
  props.mods.find((m) => m.recommended)?.id ?? props.mods[0]?.id ?? null,
);
</script>

<template>
  <div class="mod-picker">
    <h3>Select Game Variant</h3>
    <div class="mod-list">
      <Button
        v-for="mod in mods"
        :key="mod.id"
        class="mod-option"
        :class="{ selected: selected === mod.id }"
        @click="selected = mod.id"
      >
        <span class="mod-name">{{ mod.name }}</span>
        <span v-if="mod.recommended" class="badge badge-primary">Recommended</span>
        <p v-if="mod.description" class="mod-desc">
          {{ mod.description }}
        </p>
      </Button>
    </div>
    <Button
      class="btn-primary start-btn"
      :disabled="!selected"
      @click="selected && emit('select', selected)"
    >
      Start Game
    </Button>
  </div>
</template>

<style scoped>
.mod-picker {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}

.mod-picker h3 {
  text-align: center;
}

.mod-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.mod-option {
  text-align: left;
  padding: var(--gap);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--gap-sm);
}

.mod-option.selected {
  border-color: var(--color-primary);
  background: var(--color-surface-hover);
}

.mod-name {
  font-weight: 600;
}

.mod-desc {
  width: 100%;
  color: var(--color-text-muted);
  font-size: 0.9em;
  margin: 0;
}

.start-btn {
  align-self: center;
  padding: 8px 32px;
}
</style>
