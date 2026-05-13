<script setup lang="ts" generic="N, E">
import { computed, ref } from 'vue';
import type { GraphEdge, GraphNode, SpatialGraph } from '@open-loop/engine';
import { useSpatialGraph } from '@/composables/useSpatialGraph';

interface Point {
  x: number;
  y: number;
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type EdgeRouting = 'straight' | ((from: Point, to: Point) => string);

const props = withDefaults(
  defineProps<{
    graph: SpatialGraph<N, E>;
    positions: ReadonlyMap<string, Point>;
    edgeRouting?: EdgeRouting;
    editable?: boolean;
    selectedId?: string | null;
    viewBox?: ViewBox;
  }>(),
  {
    edgeRouting: 'straight',
    editable: false,
    selectedId: null,
    viewBox: undefined,
  },
);

const emit = defineEmits<{
  'node-click': [id: string];
  'connect-request': [fromId: string, toId: string];
}>();

defineSlots<{
  node?(props: { node: GraphNode<N>; position: Point; selected: boolean }): unknown;
  edge?(props: { edge: GraphEdge<E>; from: Point; to: Point; path: string }): unknown;
  'connect-preview'?(props: { from: Point; to: Point }): unknown;
}>();

const { nodes, edges } = useSpatialGraph(props.graph);

const ORIGIN: Point = { x: 0, y: 0 };

function pos(id: string): Point {
  return props.positions.get(id) ?? ORIGIN;
}

function edgePath(from: Point, to: Point): string {
  if (typeof props.edgeRouting === 'function') {
    return props.edgeRouting(from, to);
  }
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

const isCustomRouting = computed(() => typeof props.edgeRouting === 'function');

const resolvedViewBox = computed<ViewBox>(() => {
  if (props.viewBox) return props.viewBox;
  const entries = Array.from(props.positions.values());
  if (entries.length === 0) return { x: 0, y: 0, width: 400, height: 300 };
  let minX = entries[0].x;
  let maxX = entries[0].x;
  let minY = entries[0].y;
  let maxY = entries[0].y;
  for (const p of entries) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const padding = 40;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
});

const viewBoxString = computed(() => {
  const v = resolvedViewBox.value;
  return `${v.x} ${v.y} ${v.width} ${v.height}`;
});

interface DragState {
  fromId: string;
  cursor: Point;
}

const drag = ref<DragState | null>(null);
const rootEl = ref<SVGSVGElement | null>(null);

function clientToSvg(clientX: number, clientY: number): Point {
  const svg = rootEl.value;
  if (!svg || typeof svg.createSVGPoint !== 'function') return ORIGIN;
  const ctm = svg.getScreenCTM();
  if (!ctm) return ORIGIN;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const transformed = pt.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

function onNodeClick(id: string) {
  emit('node-click', id);
}

function onNodePointerDown(id: string, event: PointerEvent) {
  if (!props.editable) return;
  event.stopPropagation();
  drag.value = { fromId: id, cursor: pos(id) };
}

function onNodePointerUp(id: string, event: PointerEvent) {
  if (!drag.value) return;
  event.stopPropagation();
  if (id !== drag.value.fromId) {
    emit('connect-request', drag.value.fromId, id);
  }
  drag.value = null;
}

function onRootPointerMove(event: PointerEvent) {
  if (!drag.value) return;
  drag.value = { fromId: drag.value.fromId, cursor: clientToSvg(event.clientX, event.clientY) };
}

function onRootPointerUp() {
  drag.value = null;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && drag.value) drag.value = null;
}

const dragPreview = computed(() => {
  if (!drag.value) return null;
  return { from: pos(drag.value.fromId), to: drag.value.cursor };
});
</script>

<template>
  <svg
    ref="rootEl"
    class="node-wire-board"
    :viewBox="viewBoxString"
    preserveAspectRatio="xMidYMid meet"
    xmlns="http://www.w3.org/2000/svg"
    tabindex="-1"
    @pointermove="onRootPointerMove"
    @pointerup="onRootPointerUp"
    @keydown="onKeyDown"
  >
    <g class="node-wire-board-edges">
      <g
        v-for="edge in edges"
        :key="edge.id"
        :data-edge-id="edge.id"
      >
        <slot
          name="edge"
          :edge="edge"
          :from="pos(edge.fromId)"
          :to="pos(edge.toId)"
          :path="edgePath(pos(edge.fromId), pos(edge.toId))"
        >
          <path
            v-if="isCustomRouting"
            class="node-wire-board-edge-default"
            :d="edgePath(pos(edge.fromId), pos(edge.toId))"
            fill="none"
          />
          <line
            v-else
            class="node-wire-board-edge-default"
            :x1="pos(edge.fromId).x"
            :y1="pos(edge.fromId).y"
            :x2="pos(edge.toId).x"
            :y2="pos(edge.toId).y"
          />
        </slot>
      </g>
    </g>

    <g
      v-if="dragPreview"
      class="node-wire-board-preview"
    >
      <slot
        name="connect-preview"
        :from="dragPreview.from"
        :to="dragPreview.to"
      >
        <line
          class="node-wire-board-preview-default"
          :x1="dragPreview.from.x"
          :y1="dragPreview.from.y"
          :x2="dragPreview.to.x"
          :y2="dragPreview.to.y"
        />
      </slot>
    </g>

    <g class="node-wire-board-nodes">
      <g
        v-for="node in nodes"
        :key="node.id"
        :data-node-id="node.id"
        :transform="`translate(${pos(node.id).x}, ${pos(node.id).y})`"
        class="node-wire-board-node"
        :class="{ selected: selectedId === node.id, editable }"
        @click="onNodeClick(node.id)"
        @pointerdown="onNodePointerDown(node.id, $event)"
        @pointerup="onNodePointerUp(node.id, $event)"
      >
        <slot
          name="node"
          :node="node"
          :position="pos(node.id)"
          :selected="selectedId === node.id"
        >
          <circle class="node-wire-board-node-default" />
        </slot>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.node-wire-board {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--node-wire-board-bg, transparent);
  user-select: none;
  touch-action: none;
}

.node-wire-board-edge-default {
  stroke: var(--node-wire-board-edge-stroke, var(--color-border));
  stroke-width: var(--node-wire-board-edge-width, 2);
  fill: none;
}

.node-wire-board-node-default {
  r: var(--node-wire-board-node-radius, 12);
  fill: var(--node-wire-board-node-fill, var(--color-surface));
  stroke: var(--node-wire-board-node-stroke, var(--color-primary));
  stroke-width: 2;
}

.node-wire-board-node.editable {
  cursor: grab;
}

.node-wire-board-node.editable:active {
  cursor: grabbing;
}

.node-wire-board-node.selected .node-wire-board-node-default {
  stroke: var(--node-wire-board-node-stroke-selected, var(--color-primary-hover));
  stroke-width: 3;
}

.node-wire-board-preview-default {
  stroke: var(--node-wire-board-preview-stroke, var(--color-primary));
  stroke-width: var(--node-wire-board-preview-width, 2);
  stroke-dasharray: var(--node-wire-board-preview-dash, 4 4);
  pointer-events: none;
}

.node-wire-board-preview {
  pointer-events: none;
}
</style>
