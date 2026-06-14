<script setup lang="ts">
/**
 * NextActionList — right 65% of the action column's split container.
 *
 * Renders the edit queue (the player's plan for the next loop). Each row is
 * a NextActionRow child that handles its own control fan and pdnd
 * registration. This component owns:
 *
 * - The list-level pdnd monitor that translates a drop into a reorderAction.
 * - The shared drag state (fromIndex / overIndex / overEdge) provided to rows.
 *
 * First-arc port: no travel-collapse filter (no travel actions in the
 * first-arc 9-action set). The hidden-indices computation from idle-loops-ng's
 * NextActionList is dropped.
 *
 * Reference: idle-loops-ng/src/ui/components/NextActionList.vue.
 */

import { computed, onBeforeUnmount, onMounted, provide, reactive, ref } from 'vue';
import {
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import {
  getEditList,
  reorderAction,
  insertActionAt,
  getQueueAddAmount,
} from '../../modules/action-queue';
import NextActionRow from './NextActionRow.vue';
import {
  dragStateKey,
  ROW_DRAG_TYPE,
  AVAILABLE_ACTION_DRAG_TYPE,
  type DragState,
} from '../next-action-drag';

const queueAddAmount = getQueueAddAmount();

const items = computed(() => getEditList());

// ── Drag state (shared with rows via provide/inject) ───────────────────────

const dragState = reactive<DragState>({
  fromIndex: null,
  overIndex: null,
  overEdge: null,
});
provide(dragStateKey, dragState);

function resetDragState() {
  dragState.fromIndex = null;
  dragState.overIndex = null;
  dragState.overEdge = null;
}

// ── pdnd list monitor + container drop target ─────────────────────────────
//
// Two source types both drop onto the same row targets:
//   - ROW_DRAG_TYPE — within-list reorder
//   - AVAILABLE_ACTION_DRAG_TYPE — cross-column insert from TownColumn tile
//
// The list root also serves as a no-edge drop target so cross-column drags
// can append when the list is empty or the pointer misses every row.

const listEl = ref<HTMLDivElement>();

onMounted(() => {
  const monitorCleanup = monitorForElements({
    canMonitor: ({ source }) =>
      source.data.type === ROW_DRAG_TYPE || source.data.type === AVAILABLE_ACTION_DRAG_TYPE,
    onDragStart: ({ source }) => {
      if (source.data.type === ROW_DRAG_TYPE) {
        dragState.fromIndex = source.data.index as number;
      }
    },
    onDrop: ({ location, source }) => {
      const rowTarget = location.current.dropTargets.find((t) => typeof t.data.index === 'number');

      if (source.data.type === ROW_DRAG_TYPE) {
        if (!rowTarget) {
          resetDragState();
          return;
        }
        const from = source.data.index as number;
        const rawTo = rowTarget.data.index as number;
        const edge = extractClosestEdge(rowTarget.data);

        let insertAt = edge === 'bottom' ? rawTo + 1 : rawTo;
        if (from < insertAt) insertAt -= 1;

        if (from !== insertAt && insertAt >= 0 && insertAt < items.value.length) {
          reorderAction(from, insertAt);
        }
        resetDragState();
        return;
      }

      // AVAILABLE_ACTION_DRAG_TYPE — insert a fresh item at the target index
      const actionId = source.data.actionId as string | undefined;
      if (!actionId) {
        resetDragState();
        return;
      }
      const loops = Math.max(1, queueAddAmount.value);

      if (rowTarget) {
        const rawTo = rowTarget.data.index as number;
        const edge = extractClosestEdge(rowTarget.data);
        const insertAt = edge === 'bottom' ? rawTo + 1 : rawTo;
        insertActionAt(insertAt, actionId, loops);
      } else if (location.current.dropTargets.length > 0) {
        insertActionAt(items.value.length, actionId, loops);
      }
      resetDragState();
    },
  });

  let containerCleanup: (() => void) | null = null;
  if (listEl.value) {
    containerCleanup = dropTargetForElements({
      element: listEl.value,
      canDrop: ({ source }) => source.data.type === AVAILABLE_ACTION_DRAG_TYPE,
      getData: () => ({ container: true }),
    });
  }

  onBeforeUnmount(() => {
    monitorCleanup();
    containerCleanup?.();
  });
});
</script>

<template>
  <div
    ref="listEl"
    class="nal-root"
  >
    <div
      v-if="items.length === 0"
      class="nal-empty"
    >
      No actions queued. Click actions in the town column to add them.
    </div>
    <NextActionRow
      v-for="(item, index) in items"
      :key="`${item.id}-${index}`"
      :index="index"
      :item="item"
      :total="items.length"
      :hidden="false"
    />
  </div>
</template>

<style scoped>
.nal-root {
  min-height: 100%;
}

.nal-empty {
  color: var(--color-text-muted);
  font-size: 0.78em;
  padding: var(--gap-sm);
  text-align: center;
}
</style>
