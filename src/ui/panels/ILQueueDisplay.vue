<script setup lang="ts">
import { computed } from 'vue';
import { useModule } from '@/composables/useModule';
import { IdleLoopsKey } from '@/modules/mods/idle-loops';

const il = useModule(IdleLoopsKey);

/**
 * Queue-wide source label. We don't have per-item source annotation today;
 * the whole queue was installed either by the seed (manual), by the player
 * (manual — no UI for that yet), or by the last-applied recommendation.
 * When `lastRecommendation.applied`, that strategy owns the current queue.
 */
const sourceLabel = computed<string>(() => {
  const rec = il.recommendations.lastRecommendation.value;
  if (rec && rec.applied) {
    switch (rec.strategyId) {
      case 'il-best-replay':
        return 'best-replay';
      case 'il-mutate-best':
        return 'mutate-best';
      case 'il-goal':
        return 'goal';
      default:
        return rec.strategyId;
    }
  }
  return 'manual';
});

const items = computed(() =>
  il.queue.items.value.map((item, index) => {
    const def = il.actions.registry.get(item.id);
    return {
      id: item.id,
      index,
      display: def?.display ?? item.id,
      zone: def?.zone ?? '',
      active:
        index === il.queue.cursor &&
        il.queue.currentItem?.id === item.id,
    };
  }),
);

const progressPercent = computed(
  () => il.actions.progress.percentComplete.value * 100,
);
</script>

<template>
  <section class="il-panel">
    <header class="il-panel__header">
      <h3>Action Queue</h3>
      <span
        class="il-panel__badge"
        :data-source="sourceLabel"
      >{{ sourceLabel }}</span>
    </header>
    <ol class="il-queue">
      <li
        v-for="item in items"
        :key="item.index"
        class="il-queue__item"
        :class="{ active: item.active }"
      >
        <span class="il-queue__index">{{ item.index + 1 }}.</span>
        <span class="il-queue__name">{{ item.display }}</span>
        <span
          v-if="item.zone"
          class="il-queue__zone"
        >{{ item.zone }}</span>
        <div
          v-if="item.active"
          class="il-queue__progress"
          aria-hidden="true"
        >
          <div
            class="il-queue__progress-fill"
            :style="{ width: progressPercent + '%' }"
          />
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.il-panel {
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.il-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--gap-sm, 8px);
}
.il-panel__header h3 {
  margin: 0;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted, var(--color-muted));
}
.il-panel__badge {
  font-size: 0.7em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: var(--radius-sm, 4px);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted, var(--color-muted));
}
.il-panel__badge[data-source='best-replay'] {
  color: var(--color-accent, #4a6cf7);
  border-color: currentColor;
}
.il-panel__badge[data-source='mutate-best'] {
  color: var(--color-warning, #d48f36);
  border-color: currentColor;
}
.il-panel__badge[data-source='goal'] {
  color: var(--color-success, #4a9d5b);
  border-color: currentColor;
}
.il-queue {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.il-queue__item {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 4px 8px;
  border-radius: var(--radius-sm, 4px);
  font-size: 0.85em;
}
.il-queue__item.active {
  background: color-mix(in srgb, var(--color-accent, #4a6cf7) 12%, transparent);
}
.il-queue__index {
  color: var(--color-text-muted, var(--color-muted));
  font-variant-numeric: tabular-nums;
  min-width: 1.5em;
}
.il-queue__zone {
  font-size: 0.75em;
  color: var(--color-text-muted, var(--color-muted));
}
.il-queue__progress {
  grid-column: 1 / -1;
  margin-top: 4px;
  height: 3px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}
.il-queue__progress-fill {
  height: 100%;
  background: var(--color-accent, #4a6cf7);
  transition: width 0.05s linear;
}
</style>
