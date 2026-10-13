<!--
  PlantingBoard — the plot as a planting plan inside its brick wall. Beds,
  stone and the seedbed are DOM cells; the gap the pests come through is a
  break in the wall. The plants are drawn in their cells. Pests, shots and the
  slime trail they follow are the `PestLayer` canvas over the cells, which
  never takes a click. When night falls the board darkens, and nothing can be
  planted until the wave is over.

  Costume classes: wg-board, wg-board__wall, wg-board__cell (data-terrain,
  data-plant), wg-board__ghost (data-legal).
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PlantId } from '../../data';
import type { PlotRun } from '../../modules';
import PlantGlyph from './PlantGlyph.vue';
import PestLayer from './PestLayer.vue';

const props = defineProps<{
  run: PlotRun;
  /** The plant in hand, or null. */
  tool: PlantId | null;
  /** A planted cell the gardener is looking at, by plant id. */
  selected: number | null;
}>();
const emit = defineEmits<{
  cell: [x: number, y: number];
  hover: [cell: { x: number; y: number } | null];
  cancel: [];
}>();

const hover = ref<{ x: number; y: number } | null>(null);

const cells = computed(() => {
  void props.run.version.value;
  const { grid, plants } = props.run;
  const out = [];
  for (let y = 0; y < grid.height; y++)
    for (let x = 0; x < grid.width; x++) {
      const c = grid.at(x, y);
      const p = c.plantId === null ? null : (plants.get(c.plantId) ?? null);
      out.push({ x, y, key: `${x},${y}`, terrain: c.terrain, plant: p });
    }
  return out;
});

const ghost = computed(() => {
  void props.run.version.value;
  if (!props.tool || !hover.value) return null;
  const { x, y } = hover.value;
  return { x, y, legal: props.run.canPlant(props.tool, x, y).ok };
});

/** Cells a marigold under the cursor would touch, or that the selected marigold touches. */
const companions = computed(() => {
  void props.run.version.value;
  let at: { x: number; y: number } | null = null;
  if (props.tool === 'marigold' && hover.value) at = hover.value;
  else if (props.selected !== null) {
    const p = props.run.plants.get(props.selected);
    if (p?.def === 'marigold') at = p;
  }
  if (!at) return new Set<string>();
  const out = new Set<string>();
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) if (dx || dy) out.add(`${at.x + dx},${at.y + dy}`);
  return out;
});

const night = computed(() => {
  void props.run.version.value;
  return props.run.phase === 'wave';
});

function enter(x: number, y: number) {
  hover.value = { x, y };
  emit('hover', hover.value);
}
function leave() {
  hover.value = null;
  emit('hover', null);
}
</script>

<template>
  <div
    class="wg-board"
    :class="{ night }"
    :style="{ '--cols': run.grid.width, '--rows': run.grid.height }"
  >
    <div class="wg-board__wall" aria-hidden="true">
      <span class="gap" :style="{ top: `calc(${run.gap.y} * var(--cell))` }" />
    </div>
    <div
      class="wg-board__beds"
      role="grid"
      aria-label="The plot"
      @mouseleave="leave"
      @contextmenu.prevent="emit('cancel')"
    >
      <button
        v-for="c in cells"
        :key="c.key"
        type="button"
        class="wg-board__cell"
        :data-terrain="c.terrain"
        :data-plant="c.plant?.def"
        :class="{
          selected: c.plant !== null && c.plant.id === selected,
          companion: companions.has(c.key),
        }"
        :aria-label="`${c.x + 1}, ${c.y + 1}: ${c.plant ? c.plant.def : c.terrain}`"
        @mouseenter="enter(c.x, c.y)"
        @click="emit('cell', c.x, c.y)"
      >
        <span v-if="c.terrain === 'seedbed'" class="sprouts" aria-hidden="true" />
        <template v-if="c.plant">
          <PlantGlyph :id="c.plant.def" />
          <span v-if="c.plant.level > 1" class="lvl" aria-hidden="true">
            <i v-for="i in c.plant.level - 1" :key="i" />
          </span>
        </template>
      </button>
      <div
        v-if="ghost"
        class="wg-board__ghost"
        :data-legal="ghost.legal"
        :style="{ left: `calc(${ghost.x} * var(--cell))`, top: `calc(${ghost.y} * var(--cell))` }"
        aria-hidden="true"
      >
        <PlantGlyph v-if="tool" :id="tool" />
      </div>
      <div class="dusk" aria-hidden="true" />
      <PestLayer :run="run" :tool="tool" :hover="hover" :selected="selected" />
    </div>
  </div>
</template>

<style scoped>
.wg-board {
  --cell: 48px;
  --wall: 16px;
  position: relative;
  width: calc(var(--cols) * var(--cell) + 2 * var(--wall));
  padding: var(--wall);
  /* stretcher bond: each course sits half a brick along from the one below */
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='18'%3E%3Crect width='36' height='18' fill='%233a241b'/%3E%3Crect x='1' y='1' width='16' height='7' fill='%237e3b2a'/%3E%3Crect x='19' y='1' width='16' height='7' fill='%23733522'/%3E%3Crect x='-8' y='10' width='16' height='7' fill='%23864130'/%3E%3Crect x='10' y='10' width='16' height='7' fill='%237a3926'/%3E%3Crect x='28' y='10' width='16' height='7' fill='%23864130'/%3E%3C/svg%3E");
  border-radius: 4px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.45);
}
.wg-board__wall {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
/* the gap in the west wall the pests come through */
.wg-board__wall .gap {
  position: absolute;
  left: 0;
  width: var(--wall);
  height: var(--cell);
  margin-top: var(--wall);
  background: var(--wg-bed);
  box-shadow: inset 4px 0 6px rgba(0, 0, 0, 0.5);
}
.wg-board__beds {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell));
  grid-template-rows: repeat(var(--rows), var(--cell));
  background: var(--wg-bed);
}
.wg-board__cell {
  position: relative;
  width: var(--cell);
  height: var(--cell);
  padding: 4px;
  border: 0;
  background:
    linear-gradient(180deg, transparent 46%, var(--wg-bed-furrow) 46% 54%, transparent 54%),
    var(--wg-bed);
  box-shadow: inset 0 0 0 0.5px rgba(231, 220, 194, 0.05);
  cursor: pointer;
}
.wg-board__cell:hover {
  box-shadow: inset 0 0 0 1px rgba(232, 169, 74, 0.35);
}
.wg-board__cell[data-terrain='stone'] {
  background: var(--wg-stone);
  box-shadow:
    inset 0 0 0 2px var(--wg-stone-edge),
    inset 2px 2px 0 3px rgba(0, 0, 0, 0.2);
  cursor: default;
}
.wg-board__cell[data-terrain='gap'] {
  background: #241c14;
}
.wg-board__cell[data-terrain='seedbed'] {
  background: #3a2c1c;
  box-shadow: inset 0 0 0 1px rgba(156, 204, 101, 0.4);
}
.sprouts {
  position: absolute;
  inset: 10px;
  background:
    radial-gradient(circle at 25% 30%, var(--wg-seedling) 0 3px, transparent 3.5px),
    radial-gradient(circle at 70% 25%, var(--wg-seedling) 0 3px, transparent 3.5px),
    radial-gradient(circle at 45% 70%, var(--wg-seedling) 0 3px, transparent 3.5px),
    radial-gradient(circle at 80% 75%, var(--wg-seedling) 0 3px, transparent 3.5px);
}
.wg-board__cell.selected {
  box-shadow: inset 0 0 0 2px var(--wg-lantern);
}
.wg-board__cell.companion {
  box-shadow: inset 0 0 0 2px rgba(229, 138, 44, 0.65);
}
.lvl {
  position: absolute;
  left: 4px;
  bottom: 3px;
  display: flex;
  gap: 2px;
}
.lvl i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--wg-lantern);
}
.wg-board__ghost {
  position: absolute;
  width: var(--cell);
  height: var(--cell);
  padding: 4px;
  opacity: 0.6;
  pointer-events: none;
  outline: 2px dashed var(--wg-lantern);
  outline-offset: -2px;
}
.wg-board__ghost[data-legal='false'] {
  outline-color: var(--wg-loss);
  opacity: 0.3;
}
/* night falls: the beds go blue-dark while a wave walks */
.dusk {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(14, 22, 38, 0.42);
  opacity: 0;
  transition: opacity 1.2s ease;
}
.night .dusk {
  opacity: 1;
}
.night .wg-board__cell {
  cursor: default;
}
</style>
