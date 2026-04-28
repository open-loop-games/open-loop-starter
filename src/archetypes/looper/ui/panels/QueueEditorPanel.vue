<script setup lang="ts">
import { computed } from 'vue';
import { useFormatting } from '@/composables/useFormatting';
import { useQueue } from '../../composables/useQueue';
import { useActions } from '../../composables/useActions';

const queue = useQueue();
const actions = useActions();
const { format } = useFormatting();

const items = computed(() =>
  queue.items.value.map((item, index) => {
    const row = actions.getRow(item.id);
    return {
      index,
      id: item.id,
      name: row?.def.name ?? item.id,
      adjustedTicks: row?.adjustedTicks.value ?? 0,
      loopsLeft: item.metadata.loopsLeft ?? 1,
      loops: item.metadata.loops ?? 1,
      isCursor: index === queue.cursor.value,
    };
  }),
);

function moveUp(index: number): void {
  if (index <= 0) return;
  queue.reorder(index, index - 1);
}

function moveDown(index: number): void {
  if (index >= items.value.length - 1) return;
  queue.reorder(index, index + 1);
}

function remove(index: number): void {
  queue.remove(index);
}
</script>

<template>
  <section
    class="queue-editor"
    data-testid="queue-editor"
  >
    <header class="queue-editor__header">
      <h3>Queue</h3>
      <div class="queue-editor__actions">
        <label
          class="queue-editor__toggle"
          data-testid="queue-repeat-last"
        >
          <input
            v-model="queue.repeatLastAction.value"
            type="checkbox"
          >
          Repeat last
        </label>
        <button
          class="btn-sm"
          :data-testid="queue.isPaused.value ? 'queue-resume' : 'queue-pause'"
          @click="queue.togglePause"
        >
          {{ queue.isPaused.value ? 'Resume' : 'Pause' }}
        </button>
        <button
          class="btn-sm"
          data-testid="queue-clear"
          :disabled="items.length === 0"
          @click="queue.clear"
        >
          Clear
        </button>
      </div>
    </header>

    <p
      v-if="items.length > 0"
      class="queue-editor__budget"
      data-testid="queue-budget"
    >
      Plan budget: {{ format(queue.manaNeededFromCursor.value, 0) }}t remaining /
      {{ format(queue.manaNeededTotal.value, 0) }}t per pass
    </p>

    <ol
      v-if="items.length > 0"
      class="queue-list"
    >
      <li
        v-for="item in items"
        :key="`${item.index}:${item.id}`"
        class="queue-list__item"
        :class="{ 'queue-list__item--cursor': item.isCursor }"
      >
        <span class="queue-list__index">{{ item.index + 1 }}</span>
        <div class="queue-list__main">
          <span class="queue-list__name">{{ item.name }}</span>
          <span class="queue-list__meta">
            <span class="queue-list__cost">{{ format(item.adjustedTicks, 0) }}t</span>
            <span class="queue-list__loops">×{{ item.loopsLeft }}/{{ item.loops }}</span>
          </span>
        </div>
        <div class="queue-list__controls">
          <button
            class="btn-tiny"
            :disabled="item.index === 0"
            :data-testid="`queue-up-${item.index}`"
            @click="moveUp(item.index)"
          >
            ↑
          </button>
          <button
            class="btn-tiny"
            :disabled="item.index === items.length - 1"
            :data-testid="`queue-down-${item.index}`"
            @click="moveDown(item.index)"
          >
            ↓
          </button>
          <button
            class="btn-tiny"
            :data-testid="`queue-remove-${item.index}`"
            @click="remove(item.index)"
          >
            ✕
          </button>
        </div>
      </li>
    </ol>
    <p
      v-else
      class="queue-empty"
    >
      Queue is empty. Pick actions from the drawer — the loop starts when you do.
    </p>

    <p
      v-if="queue.isHolding.value"
      class="queue-status queue-status--holding"
    >
      Waiting on mana / unlock — try resetting the loop.
    </p>
  </section>
</template>

<style scoped>
.queue-editor {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
  background: var(--color-surface-alt, var(--color-surface));
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  min-height: 0;
}

.queue-editor__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.queue-editor__header h3 {
  font-size: 0.95em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
}

.queue-editor__actions {
  display: flex;
  gap: var(--gap-sm);
}

.queue-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.queue-list__item {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: var(--gap-sm);
  align-items: center;
  padding: 4px var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, var(--radius));
}

.queue-list__index {
  color: var(--color-text-muted, var(--color-text));
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
}

.queue-list__main {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
}

.queue-list__name {
  font-weight: 500;
}

.queue-list__meta {
  display: flex;
  gap: var(--gap-sm);
  align-items: baseline;
  font-size: 0.8em;
  color: var(--color-text-muted, var(--color-text));
  font-variant-numeric: tabular-nums;
}

.queue-list__loops {
  color: var(--color-text-muted, var(--color-text));
}

.queue-list__item--cursor {
  border-color: var(--color-primary, var(--color-text));
  background: var(--color-primary-soft, transparent);
}

.queue-editor__toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78em;
  color: var(--color-text-muted, var(--color-text));
  cursor: pointer;
  user-select: none;
}

.queue-editor__budget {
  margin: 0 0 4px 0;
  font-size: 0.78em;
  color: var(--color-text-muted, var(--color-text));
  font-variant-numeric: tabular-nums;
}

.queue-list__controls {
  display: flex;
  gap: 2px;
}

.btn-tiny {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, var(--radius));
  width: 22px;
  height: 22px;
  padding: 0;
  cursor: pointer;
  font-size: 0.78em;
  color: var(--color-text);
}

.btn-tiny:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-tiny:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.queue-empty {
  color: var(--color-text-muted, var(--color-text));
  font-style: italic;
  text-align: center;
  margin: var(--gap) 0;
}

.queue-status {
  font-size: 0.85em;
  margin: 0;
  padding: 4px var(--gap-sm);
  border-radius: var(--radius-sm, var(--radius));
}

.queue-status--holding {
  background: var(--color-warning-soft, rgba(255, 200, 80, 0.18));
  color: var(--color-warning, var(--color-text));
}
</style>
