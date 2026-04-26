<script setup lang="ts" generic="T">
/**
 * Opinionated DOM renderer for bounded `SpatialGrid<T>` instances.
 *
 * Sibling of `NodeWireBoard.vue` (node-and-wire boards). Together they are
 * the starter's two "fast path, no imperative renderer" spatial views.
 *
 * **Two-consumer extraction.** The `spatial-systems-family-study` deferred
 * this component in 2026-04 because Primordia's 5×5 upgrade grid was the
 * only consumer — below the two-consumer extraction threshold. The
 * 60×60 creep-vs-creep map is the second forcing-function consumer at
 * ~3600-cell scale; extraction now clears the bar. The rendering-boundary
 * warning against bikeshed-over-tile-styling still applies: the component
 * owns layout and event wiring only. All cell vocabulary (faction colors,
 * terrain, ownership, visibility semantics beyond the generic fog mask)
 * lives at the call site via `cellClass` / `cellStyle` / the default slot.
 *
 * **Reactive shape.** Per-cell memoized `computed`s scale poorly beyond
 * the ~200-entity budget the boundary spec calls out for node-wire boards.
 * Instead this component self-subscribes to the grid's `cellChanged`,
 * `fovUpdated`, and `maskChanged` events, bumps one of two
 * `shallowRef` version counters, and rebuilds the flat cell array inside
 * a single `computed`. 3600 cells × 1 Hz mutation bursts fit inside Vue's
 * keyed-patch budget with this pattern.
 *
 * **Known gap.** `SpatialGrid.restore()` does not emit events (by design —
 * the round transition is not an incremental mutation). Consumers that
 * want the grid to re-render after a bulk restore should either re-mount
 * the DomGrid (e.g. via `v-if` against a round-phase ref) or bump an
 * external `refresh` prop (not yet provided).
 */

import { computed, onScopeDispose, shallowRef, triggerRef } from 'vue';
import type { SpatialGrid } from 'open-loop-engine';

type CellClassValue = string | string[] | Record<string, boolean>;
type CellStyleValue = Record<string, string>;

interface CellEntry<C> {
  x: number;
  y: number;
  cell: C;
  visibility: 'visible' | 'explored' | 'hidden';
}

const props = withDefaults(
  defineProps<{
    grid: SpatialGrid<T>;
    cellClass?: (cell: T, x: number, y: number) => CellClassValue | undefined;
    cellStyle?: (cell: T, x: number, y: number) => CellStyleValue | undefined;
    /**
     * CSS size applied to both width and height of each cell. Number → `px`;
     * string passed through verbatim (`'1rem'`, `'var(--my-size)'`, etc.).
     * Omitted → falls back to the `--dom-grid-cell-size` custom property
     * (default `12px`).
     */
    cellSize?: number | string;
    /**
     * When true, applies `dom-grid-cell--hidden` and `dom-grid-cell--explored`
     * classes to cells based on the grid's `visible` / `explored` bitmaps.
     * Omniscient sims (no fog of war) leave this at the default `false`.
     */
    showVisibility?: boolean;
  }>(),
  {
    cellClass: undefined,
    cellStyle: undefined,
    cellSize: undefined,
    showVisibility: false,
  },
);

const emit = defineEmits<{
  'cell-click': [x: number, y: number, cell: T];
}>();

defineSlots<{
  cell?(props: { cell: T; x: number; y: number }): unknown;
}>();

const cellVersion = shallowRef(0);
const maskVersion = shallowRef(0);

const off: Array<() => void> = [
  props.grid.on('cellChanged', () => {
    cellVersion.value++;
    triggerRef(cellVersion);
  }),
  props.grid.on('fovUpdated', () => {
    maskVersion.value++;
    triggerRef(maskVersion);
  }),
  props.grid.on('maskChanged', () => {
    maskVersion.value++;
    triggerRef(maskVersion);
  }),
];

onScopeDispose(() => {
  for (const fn of off) fn();
});

const cells = computed<CellEntry<T>[]>(() => {
  void cellVersion.value;
  void maskVersion.value;
  const { width, height, visible, explored } = props.grid;
  const out: CellEntry<T>[] = new Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const v = visible[i] === 1;
      const e = explored[i] === 1;
      out[i] = {
        x,
        y,
        cell: props.grid.at(x, y),
        visibility: v ? 'visible' : e ? 'explored' : 'hidden',
      };
    }
  }
  return out;
});

const resolvedCellSize = computed(() => {
  if (props.cellSize === undefined) return 'var(--dom-grid-cell-size, 12px)';
  return typeof props.cellSize === 'number' ? `${props.cellSize}px` : props.cellSize;
});

const gridStyle = computed<Record<string, string>>(() => ({
  gridTemplateColumns: `repeat(${props.grid.width}, ${resolvedCellSize.value})`,
  gridTemplateRows: `repeat(${props.grid.height}, ${resolvedCellSize.value})`,
}));

function visibilityClass(v: CellEntry<T>['visibility']): string | null {
  if (!props.showVisibility) return null;
  if (v === 'visible') return null;
  return `dom-grid-cell--${v}`;
}

function onCellClick(entry: CellEntry<T>) {
  emit('cell-click', entry.x, entry.y, entry.cell);
}
</script>

<template>
  <div
    class="dom-grid"
    :style="gridStyle"
    :data-width="grid.width"
    :data-height="grid.height"
  >
    <div
      v-for="entry in cells"
      :key="entry.y * grid.width + entry.x"
      class="dom-grid-cell"
      :class="[
        cellClass ? cellClass(entry.cell, entry.x, entry.y) : null,
        visibilityClass(entry.visibility),
      ]"
      :style="cellStyle ? cellStyle(entry.cell, entry.x, entry.y) : undefined"
      :data-x="entry.x"
      :data-y="entry.y"
      @click="onCellClick(entry)"
    >
      <slot
        name="cell"
        :cell="entry.cell"
        :x="entry.x"
        :y="entry.y"
      />
    </div>
  </div>
</template>

<style scoped>
.dom-grid {
  display: grid;
  line-height: 0;
  background: var(--dom-grid-bg, transparent);
  user-select: none;
  touch-action: manipulation;
}

.dom-grid-cell {
  box-sizing: border-box;
  background: var(--dom-grid-cell-bg, transparent);
  border: var(--dom-grid-cell-border, none);
  cursor: var(--dom-grid-cell-cursor, default);
}

.dom-grid-cell--explored {
  opacity: var(--dom-grid-cell-explored-opacity, 0.55);
}

.dom-grid-cell--hidden {
  opacity: var(--dom-grid-cell-hidden-opacity, 0.15);
}
</style>
