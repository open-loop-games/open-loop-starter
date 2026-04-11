<script setup lang="ts">
import { computed } from 'vue';
import { coreState } from '@/modules/core';

const state = coreState!;

const byZone = computed(() => {
  const groups: Record<string, Array<{ id: string; action: ReturnType<typeof state.actions.get> }>> = {};
  for (const [id, action] of state.actions) {
    const zone = state.actionZones.get(id) ?? 'village';
    if (!state.zones.isUnlocked(zone)) continue;
    (groups[zone] ??= []).push({ id, action });
  }
  return groups;
});

const zoneOrder = computed(() =>
  state.zones.ordered.value
    .filter((z) => state.zones.isUnlocked(z.id))
    .map((z) => ({ id: z.id, name: z.name })),
);

function startAction(id: string) {
  const action = state.actions.get(id);
  if (action && !action.active.value) action.start();
}

function cancelAction(id: string) {
  const action = state.actions.get(id);
  if (action && action.active.value) action.cancel();
}
</script>

<template>
  <section class="actions-panel">
    <h3>Actions</h3>
    <div
      v-for="zone in zoneOrder"
      :key="zone.id"
      class="zone-group"
    >
      <h4>{{ zone.name }}</h4>
      <div class="action-list">
        <div
          v-for="{ id, action } in byZone[zone.id] ?? []"
          :key="id"
          class="action-card"
        >
          <div class="action-info">
            <span class="action-name">{{ action!.display.title }}</span>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: (action!.percentComplete.value * 100) + '%' }"
              />
            </div>
          </div>
          <div class="action-controls">
            <button
              v-if="!action!.active.value"
              class="btn-primary btn-sm"
              @click="startAction(id)"
            >
              Start
            </button>
            <button
              v-else
              class="btn-danger btn-sm"
              @click="cancelAction(id)"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.actions-panel h3 {
  font-size: 1em;
  margin-bottom: var(--gap-sm);
}
.zone-group {
  margin-bottom: var(--gap);
}
.zone-group h4 {
  font-size: 0.85em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  margin-bottom: var(--gap-sm);
}
.action-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
.action-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.action-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-right: var(--gap);
}
.action-name {
  font-weight: 600;
  font-size: 0.95em;
}
.progress-bar {
  height: 6px;
  background: var(--color-bg);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--color-success);
  transition: width 0.05s linear;
}
</style>
