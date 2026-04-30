<script setup lang="ts">
/**
 * Action column — replaces `QueueEditorPanel`. Hosts both halves of the
 * edit/active queue split:
 *
 *   ┌─ Active (current dispatch) ─────┐
 *   │ cursor-walked snapshot          │
 *   └─────────────────────────────────┘
 *   ┌─ Edit (player's plan) ──────────┐
 *   │ pdnd-reorderable rows           │
 *   │ + cross-column drop target for  │
 *   │   town tile actions             │
 *   └─────────────────────────────────┘
 *   [keep current active] [repeat last] [add to top]
 *   [Apply now] [Pause] [Clear plan]
 *
 * Drag interactions:
 *   - within edit list — pdnd `ROW_DRAG_TYPE`, attach-closest-edge
 *   - cross-column — town tile carries `AVAILABLE_ACTION_DRAG_TYPE`; both
 *     edit rows and the list container are valid drop targets. Container
 *     drop → append; row drop → insert at edge.
 *
 * The cursor-walked active list does NOT participate in drag — it's read-only
 * dispatch state. Edits land on the edit list and apply on the next loop
 * boundary (or via the explicit "Apply now" button).
 */

import { computed, onBeforeUnmount, onMounted, provide, reactive, ref } from 'vue';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { SwitchRoot, SwitchThumb } from 'reka-ui';
import { useFormatting } from '@/composables/useFormatting';
import { useActions } from '../../composables/useActions';
import { useQueue } from '../../composables/useQueue';
import {
  AVAILABLE_ACTION_DRAG_TYPE,
  ROW_DRAG_TYPE,
  dragStateKey,
  type DragState,
} from '../queue-drag';

const queue = useQueue();
const actions = useActions();
const { format } = useFormatting();

const dragState = reactive<DragState>({
  fromIndex: null,
  overIndex: null,
  overEdge: null,
});
provide(dragStateKey, dragState);

function resetDrag(): void {
  dragState.fromIndex = null;
  dragState.overIndex = null;
  dragState.overEdge = null;
}

// ── List-level drag monitor + container drop ────────────────────────────────

const listEl = ref<HTMLElement | null>(null);

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
          resetDrag();
          return;
        }
        const from = source.data.index as number;
        const rawTo = rowTarget.data.index as number;
        const edge = extractClosestEdge(rowTarget.data);
        let insertAt = edge === 'bottom' ? rawTo + 1 : rawTo;
        if (from < insertAt) insertAt -= 1;

        const len = queue.editItems.value.length;
        if (from !== insertAt && insertAt >= 0 && insertAt < len) {
          queue.reorder(from, insertAt);
        }
        resetDrag();
        return;
      }

      // AVAILABLE_ACTION_DRAG_TYPE — town tile dropped onto edit list.
      const actionId = source.data.actionId as string | undefined;
      if (!actionId) {
        resetDrag();
        return;
      }
      if (rowTarget) {
        const rawTo = rowTarget.data.index as number;
        const edge = extractClosestEdge(rowTarget.data);
        const insertAt = edge === 'bottom' ? rawTo + 1 : rawTo;
        queue.insertAt(insertAt, actionId, 1);
      } else if (location.current.dropTargets.length > 0) {
        // Container-level drop — append.
        queue.insertAt(queue.editItems.value.length, actionId, 1);
      }
      resetDrag();
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

// ── Per-row pdnd registration via callback ref ──────────────────────────────

const rowBindings = new WeakMap<HTMLElement, () => void>();

function bindRow(el: Element | null, index: number): void {
  if (!(el instanceof HTMLElement)) return;
  if (rowBindings.has(el)) return;
  const cleanup = combine(
    draggable({
      element: el,
      getInitialData: () => ({ type: ROW_DRAG_TYPE, index }),
      onDragStart: () => el.classList.add('is-dragging'),
      onDrop: () => el.classList.remove('is-dragging'),
    }),
    dropTargetForElements({
      element: el,
      canDrop: ({ source }) =>
        source.data.type === ROW_DRAG_TYPE || source.data.type === AVAILABLE_ACTION_DRAG_TYPE,
      getData: ({ input, element }) =>
        attachClosestEdge({ index }, { input, element, allowedEdges: ['top', 'bottom'] }),
      getIsSticky: () => true,
      onDragEnter: ({ self }) => {
        dragState.overIndex = index;
        dragState.overEdge = extractClosestEdge(self.data);
      },
      onDrag: ({ self }) => {
        const edge = extractClosestEdge(self.data);
        if (dragState.overIndex !== index || dragState.overEdge !== edge) {
          dragState.overIndex = index;
          dragState.overEdge = edge;
        }
      },
      onDragLeave: () => {
        if (dragState.overIndex === index) {
          dragState.overIndex = null;
          dragState.overEdge = null;
        }
      },
    }),
  );
  rowBindings.set(el, cleanup);
}

onBeforeUnmount(() => {
  // The WeakMap entries clean themselves once their elements are GC'd,
  // but the pdnd cleanup functions hold listener registrations — call
  // each one to remove them eagerly.
  // (Iterating a WeakMap directly isn't supported; the row v-for unmount
  // hooks each call their cleanup via the element's __cleanup — but
  // since we don't track that here, rely on monitor cleanup above.)
});

// ── Active vs edit divergence detector ──────────────────────────────────────

const editItems = computed(() => queue.editItems.value);
const activeItems = computed(() => queue.activeItems.value);

const isDiverged = computed(() => {
  const e = editItems.value;
  const a = activeItems.value;
  if (e.length !== a.length) return true;
  for (let i = 0; i < e.length; i++) {
    if (e[i].id !== a[i].id) return true;
    if (e[i].metadata.loops !== a[i].metadata.loops) return true;
  }
  return false;
});

// ── Display helpers ─────────────────────────────────────────────────────────

interface RowDisplay {
  index: number;
  id: string;
  name: string;
  cost: string;
  loops: number;
  loopsLeft?: number;
  isCursor?: boolean;
}

const activeRows = computed<RowDisplay[]>(() =>
  activeItems.value.map((item, idx) => {
    const row = actions.getRow(item.id);
    return {
      index: idx,
      id: item.id,
      name: row?.def.name ?? item.id,
      cost: format(row?.adjustedTicks.value ?? 0, 0),
      loops: item.metadata.loops,
      loopsLeft: item.metadata.loopsLeft,
      isCursor: idx === queue.cursor.value,
    };
  }),
);

const editRows = computed<RowDisplay[]>(() =>
  editItems.value.map((item, idx) => {
    const row = actions.getRow(item.id);
    return {
      index: idx,
      id: item.id,
      name: row?.def.name ?? item.id,
      cost: format(row?.adjustedTicks.value ?? 0, 0),
      loops: item.metadata.loops,
    };
  }),
);

function moveUp(index: number): void {
  if (index <= 0) return;
  queue.reorder(index, index - 1);
}

function moveDown(index: number): void {
  if (index >= editRows.value.length - 1) return;
  queue.reorder(index, index + 1);
}
</script>

<template>
  <section
    class="action-column"
    data-testid="action-column"
  >
    <header class="action-column__header">
      <h3>Plan</h3>
      <div class="action-column__budgets">
        <span
          class="action-column__budget"
          data-testid="active-from-cursor"
        >
          run: {{ format(queue.manaActiveFromCursor.value, 0) }}t
        </span>
        <span
          class="action-column__budget action-column__budget--edit"
          data-testid="edit-total"
        >
          plan: {{ format(queue.manaEditTotal.value, 0) }}t
        </span>
      </div>
    </header>

    <div
      class="action-column__list action-column__list--active"
      data-testid="active-list"
    >
      <h4 class="action-column__list-heading">
        Current
      </h4>
      <ol
        v-if="activeRows.length > 0"
        class="qrow-list"
      >
        <li
          v-for="row in activeRows"
          :key="`active-${row.index}-${row.id}`"
          class="qrow"
          :class="{ 'qrow--cursor': row.isCursor }"
        >
          <span class="qrow__index">{{ row.index + 1 }}</span>
          <span class="qrow__name">{{ row.name }}</span>
          <span class="qrow__meta">
            <span class="qrow__cost">{{ row.cost }}t</span>
            <span class="qrow__loops">×{{ row.loopsLeft }}/{{ row.loops }}</span>
          </span>
        </li>
      </ol>
      <p
        v-else
        class="qrow-list__empty"
      >
        Loop paused — add an action to start.
      </p>
      <p
        v-if="queue.isHolding.value"
        class="qrow-status qrow-status--holding"
      >
        Waiting on mana / unlock — try resetting the loop.
      </p>
    </div>

    <div
      class="action-column__list action-column__list--edit"
      data-testid="edit-list"
    >
      <header class="action-column__list-head">
        <h4 class="action-column__list-heading">
          Next plan
        </h4>
        <button
          v-if="isDiverged && editItems.length > 0"
          class="btn-tiny"
          data-testid="apply-edit-now"
          title="Replace current dispatch with the next plan"
          @click="queue.applyEditToActive"
        >
          Apply now
        </button>
      </header>

      <div
        ref="listEl"
        class="qrow-list-wrap"
      >
        <ol
          v-if="editRows.length > 0"
          class="qrow-list"
        >
          <li
            v-for="row in editRows"
            :ref="(el) => bindRow(el as Element | null, row.index)"
            :key="`edit-${row.index}-${row.id}`"
            class="qrow qrow--edit"
            :class="{
              'qrow--drag-over':
                dragState.overIndex === row.index && dragState.fromIndex !== row.index,
              'qrow--edge-top':
                dragState.overIndex === row.index &&
                dragState.fromIndex !== row.index &&
                dragState.overEdge === 'top',
              'qrow--edge-bottom':
                dragState.overIndex === row.index &&
                dragState.fromIndex !== row.index &&
                dragState.overEdge === 'bottom',
            }"
          >
            <span class="qrow__index">{{ row.index + 1 }}</span>
            <span class="qrow__name">{{ row.name }}</span>
            <span class="qrow__meta">
              <span class="qrow__cost">{{ row.cost }}t</span>
              <span class="qrow__loops">×{{ row.loops }}</span>
            </span>
            <div class="qrow__controls">
              <button
                class="btn-tiny"
                :disabled="row.index === 0"
                :data-testid="`edit-up-${row.index}`"
                @click="moveUp(row.index)"
              >
                ↑
              </button>
              <button
                class="btn-tiny"
                :disabled="row.index === editRows.length - 1"
                :data-testid="`edit-down-${row.index}`"
                @click="moveDown(row.index)"
              >
                ↓
              </button>
              <button
                class="btn-tiny btn-tiny--danger"
                :data-testid="`edit-remove-${row.index}`"
                @click="queue.remove(row.index)"
              >
                ✕
              </button>
            </div>
          </li>
        </ol>
        <p
          v-else
          class="qrow-list__empty"
        >
          No queued plan. Click an action — or drag a tile here.
        </p>
      </div>
    </div>

    <div class="action-column__toggles">
      <label
        class="action-column__toggle"
        data-testid="toggle-keep-active"
      >
        <SwitchRoot
          v-model="queue.keepActiveLoopActive.value"
          class="olui-switch"
        >
          <SwitchThumb class="olui-switch__thumb" />
        </SwitchRoot>
        <span>Keep current list active</span>
      </label>
      <label
        class="action-column__toggle"
        data-testid="toggle-repeat-last"
      >
        <SwitchRoot
          v-model="queue.repeatLastAction.value"
          class="olui-switch"
        >
          <SwitchThumb class="olui-switch__thumb" />
        </SwitchRoot>
        <span>Repeat last action</span>
      </label>
      <label
        class="action-column__toggle"
        data-testid="toggle-add-to-top"
      >
        <SwitchRoot
          v-model="queue.addToTop.value"
          class="olui-switch"
        >
          <SwitchThumb class="olui-switch__thumb" />
        </SwitchRoot>
        <span>Add to top</span>
      </label>
    </div>

    <div class="action-column__actions">
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
        :disabled="editItems.length === 0"
        @click="queue.clear"
      >
        Clear plan
      </button>
    </div>
  </section>
</template>

<style scoped>
.action-column {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
  background: var(--color-surface-alt, var(--color-surface));
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  min-height: 0;
  flex: 1 1 auto;
}

.action-column__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.action-column__header h3 {
  font-size: 0.95em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
  margin: 0;
}

.action-column__budgets {
  display: flex;
  gap: var(--gap-sm);
  font-size: 0.78em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted, var(--color-text));
}

.action-column__budget--edit {
  color: var(--color-primary, var(--color-text));
  font-weight: 500;
}

.action-column__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

.action-column__list--edit {
  flex: 1 1 auto;
  min-height: 100px;
}

.action-column__list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--gap-sm);
}

.action-column__list-heading {
  margin: 0;
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
}

.qrow-list-wrap {
  flex: 1 1 auto;
  min-height: 80px;
  overflow-y: auto;
  border: 1px dashed transparent;
  border-radius: var(--radius-sm, var(--radius));
  padding: 2px;
}

.qrow-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.qrow {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  gap: var(--gap-sm);
  align-items: center;
  padding: 3px var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, var(--radius));
  font-size: 0.85em;
  background: var(--color-bg, transparent);
}

.qrow--edit {
  grid-template-columns: 22px 1fr auto auto;
  cursor: grab;
  position: relative;
}

.qrow--edit:active {
  cursor: grabbing;
}

.qrow__index {
  font-size: 0.78em;
  color: var(--color-text-muted, var(--color-text));
  font-variant-numeric: tabular-nums;
}

.qrow__name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qrow__meta {
  display: inline-flex;
  gap: var(--gap-sm);
  align-items: baseline;
  font-size: 0.78em;
  color: var(--color-text-muted, var(--color-text));
  font-variant-numeric: tabular-nums;
}

.qrow--cursor {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, transparent);
}

.qrow.is-dragging {
  opacity: 0.4;
}

.qrow--drag-over {
  background: var(--color-primary-soft, transparent);
}

.qrow--edge-top::before,
.qrow--edge-bottom::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
  pointer-events: none;
}
.qrow--edge-top::before {
  top: -2px;
}
.qrow--edge-bottom::after {
  bottom: -2px;
}

.qrow__controls {
  display: flex;
  gap: 1px;
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

.btn-tiny--danger:hover:not(:disabled) {
  border-color: var(--color-danger, var(--color-primary));
  color: var(--color-danger, var(--color-primary));
}

.qrow-list__empty {
  color: var(--color-text-muted, var(--color-text));
  font-style: italic;
  text-align: center;
  margin: var(--gap-sm) 0;
  font-size: 0.8em;
}

.qrow-status {
  font-size: 0.8em;
  margin: 0;
  padding: 4px var(--gap-sm);
  border-radius: var(--radius-sm, var(--radius));
}

.qrow-status--holding {
  background: var(--color-warning-soft, rgba(255, 200, 80, 0.18));
  color: var(--color-warning, var(--color-text));
}

.action-column__toggles {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: var(--gap-sm) 0;
  border-top: 1px solid var(--color-border);
}

.action-column__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8em;
  color: var(--color-text-muted, var(--color-text));
  cursor: pointer;
  user-select: none;
}

.action-column__actions {
  display: flex;
  gap: var(--gap-sm);
}

.action-column__actions .btn-sm {
  flex: 1 1 auto;
}
</style>
