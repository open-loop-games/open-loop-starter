<script setup lang="ts">
/**
 * NextActionRow — one editable row in the next-list. Owns its control fan,
 * pragmatic-drag-and-drop registration, and the visual state reactions for
 * drag feedback. The parent (NextActionList) owns the list-level drag
 * monitor and the collapse-hidden computation.
 *
 * Control fan order (right → left, reference main.view.js:344-370):
 *   cap · +/− · split · up · down · disable · remove
 *
 * First-arc port: no travel actions, no training actions, no per-action `allowed`
 * gating — those branches from idle-loops-ng's NextActionRow are stripped
 * here. Cap is shown for regular-type actions only (caps to current good
 * count of the action's regularVar pool).
 *
 * Reference: idle-loops-ng/src/ui/components/NextActionRow.vue.
 */

import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { Icon } from '@iconify/vue';
import Button from '@/ui/components/Button.vue';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { formatWhole } from '@open-loop/engine';
import type { SequencerItem } from '@open-loop/engine';
import {
  reorderAction,
  adjustLoops,
  toggleActionDisabled,
  splitAction,
  capActionAdditive,
  removeAction,
  getQueueAddAmount,
  type ActionMeta,
} from '../../modules/action-queue';
import { getActionDef } from '../../modules/action-runner';
import { getRegularGood } from '../../modules/zones';
import { getActionIcon } from '../../data/action-icons';
import { getZoneColor } from '../../data/zone-colors';
import { dragStateKey, ROW_DRAG_TYPE, AVAILABLE_ACTION_DRAG_TYPE } from '../next-action-drag';
import AppTooltip from './AppTooltip.vue';

const props = defineProps<{
  index: number;
  item: SequencerItem<ActionMeta>;
  total: number;
  hidden: boolean;
}>();

const dragState = inject(dragStateKey)!;
const queueAddAmount = getQueueAddAmount();

// ── Derived display ────────────────────────────────────────────────────────

const def = computed(() => getActionDef(props.item.id));

const name = computed(() => def.value?.name ?? props.item.id);

const icon = computed(() => getActionIcon(props.item.id, def.value?.zoneId));

const rowBackground = computed(() => getZoneColor(def.value?.zoneId).tint);

const hasLimit = computed(() => def.value?.type === 'regular');

const loops = computed(() => props.item.metadata.loops);

const loopsLabel = computed(() => formatWhole(loops.value));

const isDisabled = computed(() => props.item.metadata.disabled);

const isZero = computed(() => loops.value === 0);

// ── Drag visual state ──────────────────────────────────────────────────────

const isDragged = computed(() => dragState.fromIndex === props.index);
const isDragOver = computed(() => dragState.overIndex === props.index);
const overEdge = computed<Edge | null>(() =>
  isDragOver.value && !isDragged.value ? dragState.overEdge : null,
);

// ── Handlers ────────────────────────────────────────────────────────────────

function onPlus() {
  if (!def.value) return;
  adjustLoops(props.index, loops.value + queueAddAmount.value);
}

function onMinus() {
  const delta = queueAddAmount.value;
  adjustLoops(props.index, Math.max(0, loops.value - delta));
}

function onSplit() {
  splitAction(props.index);
}

function onUp() {
  if (props.index <= 0) return;
  reorderAction(props.index, props.index - 1);
}

function onDown() {
  if (props.index >= props.total - 1) return;
  reorderAction(props.index, props.index + 1);
}

function onDisable() {
  toggleActionDisabled(props.index);
}

function onRemove() {
  removeAction(props.index);
}

function onCap() {
  const d = def.value;
  if (!d || d.type !== 'regular') return;
  capActionAdditive(props.index, getRegularGood(d.regularVarId));
}

// ── Pragmatic drag-and-drop registration ───────────────────────────────────

const rowEl = ref<HTMLDivElement>();

onMounted(() => {
  if (!rowEl.value) return;
  const el = rowEl.value;

  const cleanup = combine(
    draggable({
      element: el,
      getInitialData: () => ({ type: ROW_DRAG_TYPE, index: props.index }),
    }),
    dropTargetForElements({
      element: el,
      canDrop: ({ source }) =>
        source.data.type === ROW_DRAG_TYPE || source.data.type === AVAILABLE_ACTION_DRAG_TYPE,
      getData: ({ input, element }) =>
        attachClosestEdge(
          { index: props.index },
          { input, element, allowedEdges: ['top', 'bottom'] },
        ),
      getIsSticky: () => true,
      onDragEnter: ({ self }) => {
        const edge = extractClosestEdge(self.data);
        dragState.overIndex = props.index;
        dragState.overEdge = edge;
      },
      onDrag: ({ self }) => {
        const edge = extractClosestEdge(self.data);
        if (dragState.overIndex !== props.index || dragState.overEdge !== edge) {
          dragState.overIndex = props.index;
          dragState.overEdge = edge;
        }
      },
      onDragLeave: () => {
        if (dragState.overIndex === props.index) {
          dragState.overIndex = null;
          dragState.overEdge = null;
        }
      },
    }),
  );

  onBeforeUnmount(cleanup);
});
</script>

<template>
  <div
    v-show="!hidden"
    ref="rowEl"
    class="nar-row"
    :class="{
      'is-disabled': isDisabled,
      'is-zero': isZero,
      'is-dragged': isDragged,
      'is-drag-over': isDragOver && !isDragged,
      'edge-top': overEdge === 'top',
      'edge-bottom': overEdge === 'bottom',
    }"
    :style="{ background: rowBackground }"
  >
    <Icon class="nar-icon" :icon="icon" />
    <span class="nar-name">{{ name }}</span>
    <span class="nar-count"
      >x<b>{{ loopsLabel }}</b></span
    >

    <div class="nar-fan">
      <AppTooltip v-if="hasLimit" text="Cap to good count">
        <Button class="nar-btn" @click="onCap">
          <Icon icon="mdi:circle-outline" />
        </Button>
      </AppTooltip>
      <AppTooltip text="Add loops">
        <Button class="nar-btn" @click="onPlus">
          <Icon icon="mdi:plus" />
        </Button>
      </AppTooltip>
      <AppTooltip text="Remove loops">
        <Button class="nar-btn" @click="onMinus">
          <Icon icon="mdi:minus" />
        </Button>
      </AppTooltip>
      <AppTooltip text="Split in half">
        <Button class="nar-btn" @click="onSplit">
          <Icon icon="mdi:arrow-split-vertical" />
        </Button>
      </AppTooltip>
      <AppTooltip text="Move up">
        <Button class="nar-btn" :disabled="index <= 0" @click="onUp">
          <Icon icon="mdi:chevron-up" />
        </Button>
      </AppTooltip>
      <AppTooltip text="Move down">
        <Button class="nar-btn" :disabled="index >= total - 1" @click="onDown">
          <Icon icon="mdi:chevron-down" />
        </Button>
      </AppTooltip>
      <AppTooltip :text="isDisabled ? 'Enable' : 'Disable'">
        <Button class="nar-btn" @click="onDisable">
          <Icon :icon="isDisabled ? 'mdi:check-circle-outline' : 'mdi:close-circle-outline'" />
        </Button>
      </AppTooltip>
      <AppTooltip text="Remove">
        <Button class="nar-btn nar-btn-danger" @click="onRemove">
          <Icon icon="mdi:close" />
        </Button>
      </AppTooltip>
    </div>
  </div>
</template>

<style scoped>
.nar-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  font-size: 0.78em;
  border-radius: 2px;
  min-height: 22px;
  margin-bottom: 2px;
  cursor: grab;
}

.nar-row:active {
  cursor: grabbing;
}

.nar-row > * {
  pointer-events: auto;
}

.nar-row.is-disabled,
.nar-row.is-zero {
  opacity: 0.5;
}

.nar-row.is-dragged {
  opacity: 0.4;
}

.nar-row.is-drag-over {
  background: var(--action-hover) !important;
}

.nar-row.edge-top::before,
.nar-row.edge-bottom::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
  pointer-events: none;
}
.nar-row.edge-top::before {
  top: -2px;
}
.nar-row.edge-bottom::after {
  bottom: -2px;
}

.nar-icon {
  font-size: 14px;
  flex-shrink: 0;
  pointer-events: none;
}

.nar-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.nar-count {
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  color: var(--color-text-muted);
  pointer-events: none;
}

.nar-count b {
  color: var(--color-text);
}

.nar-fan {
  display: flex;
  align-items: center;
  gap: 1px;
  flex-shrink: 0;
  margin-left: 4px;
}

.nar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 2px;
  font-size: 12px;
}

.nar-btn:hover:not(:disabled) {
  color: var(--color-text);
  background: rgba(0, 0, 0, 0.08);
}

.nar-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.nar-btn-danger:hover:not(:disabled) {
  color: var(--color-danger);
}

.nar-btn :deep(svg) {
  pointer-events: none;
}
</style>
