<script setup lang="ts">
/**
 * CurrentActionList — left 35% of the action column's split container.
 *
 * Renders the active queue (what's currently executing). Each row shows an
 * icon, the action name, a `done/total` loop counter, and a progress-bar
 * overlay whose color and width follow reference behavior:
 *
 * - error (`errorMessage` set): red, 100% width, 30% height
 * - exhausted (loopsLeft === 0): grey, 100% width
 * - running: orange, `100 * progress.value`% width
 *
 * Reference: idle-loops-ng/src/ui/components/CurrentActionList.vue,
 * idle-loops-omsi/views/main.view.js:419-448.
 */

import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { formatWhole } from '@open-loop/engine';
import {
  getActionDef,
  getActionProgress,
  getActiveCursor,
  getActiveList,
  type ActionPayload,
} from '../../modules/action-runner';
import { getActionIcon } from '../../data/action-icons';
import type { ActionItemMetadata, SequencerItem } from '@open-loop/engine';

const props = defineProps<{ hoveredIndex: number | null }>();
const emit = defineEmits<{ (e: 'hover', index: number | null): void }>();

const items = computed(() => getActiveList());
const cursor = computed(() => getActiveCursor());

type Item = SequencerItem<ActionItemMetadata<ActionPayload>>;

function itemState(item: Item, index: number): 'done' | 'active' | 'pending' | 'error' {
  if (item.metadata.error) return 'error';
  if (index < cursor.value) return 'done';
  if (index === cursor.value) return item.metadata.payload.loopsLeft > 0 ? 'active' : 'done';
  return 'pending';
}

function barWidthPercent(item: Item, index: number): number {
  const state = itemState(item, index);
  if (state === 'error' || state === 'done') return 100;
  if (state === 'pending') return 0;
  return getActionProgress(item.id) * 100;
}

function loopCounter(item: Item): string {
  const { loops, loopsLeft } = item.metadata.payload;
  const done = Math.max(0, loops - loopsLeft);
  return `${formatWhole(done)}/${formatWhole(loops)}`;
}

function iconFor(item: Item): string {
  const def = getActionDef(item.id);
  return getActionIcon(item.id, def?.zoneId);
}

function nameFor(item: Item): string {
  return getActionDef(item.id)?.name ?? item.id;
}
</script>

<template>
  <div
    v-if="items.length === 0"
    class="cal-empty"
  >
    No active actions.
  </div>
  <div
    v-for="(item, index) in items"
    :key="`${item.id}-${index}`"
    class="cal-row"
    :class="{
      'is-hovered': props.hoveredIndex === index,
      'is-done': itemState(item, index) === 'done',
      'is-active': itemState(item, index) === 'active',
      'is-error': itemState(item, index) === 'error',
    }"
    @mouseenter="emit('hover', index)"
    @mouseleave="emit('hover', null)"
  >
    <div
      class="cal-bar"
      :class="{
        'bar-error': itemState(item, index) === 'error',
        'bar-done': itemState(item, index) === 'done',
        'bar-active': itemState(item, index) === 'active',
      }"
      :style="{ width: barWidthPercent(item, index) + '%' }"
    />
    <Icon
      class="cal-icon"
      :icon="iconFor(item)"
    />
    <span class="cal-name">{{ nameFor(item) }}</span>
    <span class="cal-loops">{{ loopCounter(item) }}</span>
  </div>
</template>

<style scoped>
.cal-empty {
  color: var(--color-text-muted);
  font-size: 0.78em;
  padding: var(--gap-sm);
  text-align: center;
}

.cal-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 5px;
  font-size: 0.78em;
  border-left: 3px solid transparent;
  border-radius: 2px;
  overflow: hidden;
  min-height: 22px;
}

.cal-row.is-hovered {
  border-left-color: var(--color-primary);
  background: rgba(255, 255, 255, 0.06);
}

.cal-row.is-done {
  opacity: 0.75;
}

.cal-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  pointer-events: none;
  transition: width 0.08s linear;
  z-index: 0;
}

.cal-bar.bar-active {
  background: var(--action-current);
}

.cal-bar.bar-done {
  background: rgba(109, 109, 109, 0.35);
}

.cal-bar.bar-error {
  background: var(--action-error);
  height: 30%;
  top: auto;
  bottom: 0;
}

.cal-icon {
  position: relative;
  z-index: 1;
  font-size: 14px;
  flex-shrink: 0;
}

.cal-name {
  position: relative;
  z-index: 1;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cal-loops {
  position: relative;
  z-index: 1;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
</style>
