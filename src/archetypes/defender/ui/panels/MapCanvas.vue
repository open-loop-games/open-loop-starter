<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue';
import { useModule } from '@/composables/useModule';
import { BloonsKey, DefenderDataKey, MapKey, RoundKey, TowersKey } from '../../modules';
import type { BloonDef, BloonId, TowerDef, TowerId } from '../../data/types';

const data = useModule(DefenderDataKey);
const map = useModule(MapKey);
const towers = useModule(TowersKey);
const bloons = useModule(BloonsKey);
const round = useModule(RoundKey);

const selectedTowerType = inject<Ref<TowerId | null>>('defender:selectedTowerType')!;

// Hover-cell + selected-tower combine into a placement preview. `null` cells
// dismiss the preview.
const hoverCell = ref<{ x: number; y: number } | null>(null);
const selectedTowerInstance = ref<string | null>(null);

const W = data.path.gridWidth;
const H = data.path.gridHeight;
// SVG view-box is the lane-unit grid; CSS lays out the surrounding box and
// preserveAspectRatio keeps the grid undistorted at any container size.
const viewBox = `0 0 ${W} ${H}`;

// Path polyline as "x0,y0 x1,y1 …" — cell centers, no path-cell rasterization
// here since the engine grid carries that. Visual width handles the on-screen
// thickness; the engine's hit logic uses point-on-line distance, not stroke
// thickness, so this is purely cosmetic.
const pathPoints = computed(() =>
  data.path.waypoints.map(([x, y]) => `${x + 0.5},${y + 0.5}`).join(' '),
);

// Buildable-cell overlay — every cell whose type is 'buildable' renders as a
// faint rect. Path cells stay blank (covered by the polyline). Blocked cells
// (tower-occupied) render with a different fill.
interface CellView {
  x: number;
  y: number;
  type: 'path' | 'buildable' | 'blocked';
}
const cells = computed<CellView[]>(() => {
  const out: CellView[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = map.cellAt(x, y);
      if (c.type === 'path') continue;
      out.push({ x, y, type: c.type });
    }
  }
  return out;
});

const towerDefById = new Map<TowerId, TowerDef>(data.towers.map((d) => [d.id, d]));
const bloonDefById = new Map<BloonId, BloonDef>(data.bloons.map((d) => [d.id, d]));

// Placed-tower view — cell-centered with a color/glyph per type.
interface PlacedView {
  instanceId: string;
  defId: TowerId;
  cx: number;
  cy: number;
  range: number;
  showRange: boolean;
}
const placedView = computed<PlacedView[]>(() =>
  towers.placedTowers.value.map((t) => {
    const def = towerDefById.get(t.defId)!;
    return {
      instanceId: t.instanceId,
      defId: t.defId,
      cx: t.cell.x + 0.5,
      cy: t.cell.y + 0.5,
      range: def.rangeLaneUnits,
      showRange: selectedTowerInstance.value === t.instanceId,
    };
  }),
);

// In-flight bloons — position interpolated by the map module's
// positionAtDistance; the engine ticks the array reactively, so this stays
// fresh each frame without explicit subscribe.
interface BloonView {
  id: string;
  defId: BloonId;
  cx: number;
  cy: number;
  frozen: boolean;
}
const bloonView = computed<BloonView[]>(() =>
  bloons.inFlight.value.map((b) => {
    const pos = map.positionAtDistance(b.distanceAlongPath);
    return {
      id: b.instanceId,
      defId: b.defId,
      cx: pos.x,
      cy: pos.y,
      frozen: b.frozenRemainingSec > 0,
    };
  }),
);

// Placement preview: range circle on hover when a tower is selected. Only
// renders if the hovered cell is buildable + unoccupied + the player has
// enough cash; otherwise the cell shows a "rejected" tint via the cell view.
const preview = computed(() => {
  const cell = hoverCell.value;
  const towerId = selectedTowerType.value;
  if (!cell || !towerId) return null;
  const def = towerDefById.get(towerId);
  if (!def) return null;
  const target = map.cellAt(cell.x, cell.y);
  const buildable = target.type === 'buildable' && target.towerInstanceId == null;
  const affordable = Number(round.money.value) >= Number(def.baseCost);
  return {
    cx: cell.x + 0.5,
    cy: cell.y + 0.5,
    range: def.rangeLaneUnits,
    valid: buildable && affordable,
  };
});

function bloonColor(id: BloonId): string {
  switch (id) {
    case 'red':
      return '#d44';
    case 'blue':
      return '#48a';
    case 'green':
      return '#4a4';
    case 'yellow':
      return '#dc3';
  }
}

function towerColor(id: TowerId): string {
  switch (id) {
    case 'dart':
      return '#7b5';
    case 'tack':
      return '#a85';
    case 'bomb':
      return '#444';
    case 'ice':
      return '#6cf';
  }
}

function onCellEnter(x: number, y: number): void {
  hoverCell.value = { x, y };
}

function onCellLeave(): void {
  hoverCell.value = null;
}

function onCellClick(x: number, y: number): void {
  const towerId = selectedTowerType.value;
  if (!towerId) return;
  if (towers.placeTower(towerId, { x, y })) {
    // Successful placement — clear selection if the player can't afford
    // another of the same type. Otherwise keep selected for rapid placement.
    const def = towerDefById.get(towerId);
    if (def && Number(round.money.value) < Number(def.baseCost)) {
      selectedTowerType.value = null;
    }
  }
}

function onTowerClick(instanceId: string, ev: MouseEvent): void {
  ev.stopPropagation();
  selectedTowerInstance.value = selectedTowerInstance.value === instanceId ? null : instanceId;
}

function sellSelected(): void {
  if (selectedTowerInstance.value == null) return;
  towers.sellTower(selectedTowerInstance.value);
  selectedTowerInstance.value = null;
}

const selectedTowerInfo = computed(() => {
  const id = selectedTowerInstance.value;
  if (!id) return null;
  const inst = towers.placedTowers.value.find((t) => t.instanceId === id);
  if (!inst) return null;
  const def = towerDefById.get(inst.defId);
  if (!def) return null;
  return {
    name: def.name,
    refund: Math.floor(Number(def.baseCost) * data.economy.sellRate),
    cell: inst.cell,
  };
});

// Bloon visual size — tiered by rank so larger ladder members look bigger.
function bloonRadius(id: BloonId): number {
  const def = bloonDefById.get(id);
  return def ? 0.18 + def.rank * 0.04 : 0.2;
}
</script>

<template>
  <div class="map-canvas">
    <svg
      class="map-canvas__svg"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Defender map"
      @mouseleave="onCellLeave"
    >
      <!-- Background buildable + blocked cells. Path cells stay invisible
           so the polyline reads as the path itself. -->
      <g class="map-canvas__cells">
        <rect
          v-for="c in cells"
          :key="`${c.x},${c.y}`"
          :x="c.x"
          :y="c.y"
          width="1"
          height="1"
          class="cell"
          :class="{
            'cell--buildable': c.type === 'buildable',
            'cell--blocked': c.type === 'blocked',
            'cell--hovered':
              hoverCell && hoverCell.x === c.x && hoverCell.y === c.y && selectedTowerType,
            'cell--hovered-invalid':
              hoverCell &&
              hoverCell.x === c.x &&
              hoverCell.y === c.y &&
              selectedTowerType &&
              preview &&
              !preview.valid,
          }"
          @mouseenter="onCellEnter(c.x, c.y)"
          @click="onCellClick(c.x, c.y)"
        />
      </g>

      <!-- Path polyline. Stroked at a chunky width to read as a track; cap
           and join rounded so corners don't notch. -->
      <polyline
        class="map-canvas__path"
        :points="pathPoints"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Placement preview — range circle on hovered buildable cell when a
           tower type is selected. -->
      <g v-if="preview">
        <circle
          :cx="preview.cx"
          :cy="preview.cy"
          :r="preview.range"
          class="preview-range"
          :class="{ 'preview-range--invalid': !preview.valid }"
        />
        <circle
          :cx="preview.cx"
          :cy="preview.cy"
          :r="0.35"
          class="preview-marker"
          :class="{ 'preview-marker--invalid': !preview.valid }"
        />
      </g>

      <!-- Placed towers + selected-tower range circle. -->
      <g class="map-canvas__towers">
        <template
          v-for="t in placedView"
          :key="t.instanceId"
        >
          <circle
            v-if="t.showRange"
            :cx="t.cx"
            :cy="t.cy"
            :r="t.range"
            class="tower-range"
          />
          <circle
            :cx="t.cx"
            :cy="t.cy"
            :r="0.42"
            class="tower"
            :class="{ 'tower--selected': t.showRange }"
            :fill="towerColor(t.defId)"
            @click="onTowerClick(t.instanceId, $event)"
          />
        </template>
      </g>

      <!-- In-flight bloons. -->
      <g class="map-canvas__bloons">
        <circle
          v-for="b in bloonView"
          :key="b.id"
          :cx="b.cx"
          :cy="b.cy"
          :r="bloonRadius(b.defId)"
          class="bloon"
          :class="{ 'bloon--frozen': b.frozen }"
          :fill="bloonColor(b.defId)"
        />
      </g>
    </svg>

    <div
      v-if="selectedTowerInfo"
      class="map-canvas__info"
    >
      <div class="info-row">
        <span class="info-label">{{ selectedTowerInfo.name }}</span>
        <span class="info-cell">cell ({{ selectedTowerInfo.cell.x }}, {{ selectedTowerInfo.cell.y }})</span>
      </div>
      <button
        class="info-sell"
        @click="sellSelected"
      >
        Sell — refund ¢ {{ selectedTowerInfo.refund }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.map-canvas {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  min-width: 0;
  min-height: 0;
}

.map-canvas__svg {
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  /* Stroke widths are in lane-units (the viewBox unit). Use a small absolute
     vector-effect so towers/bloons keep crisp 1px outlines at any zoom. */
}

.cell {
  fill: transparent;
  stroke: rgba(255, 255, 255, 0.04);
  stroke-width: 0.02;
  cursor: default;
  transition: fill 0.1s ease;
}

.cell--buildable {
  fill: color-mix(in srgb, var(--color-fg, #fff) 4%, transparent);
}

.cell--blocked {
  fill: color-mix(in srgb, var(--color-fg, #fff) 8%, transparent);
}

.cell--hovered {
  fill: color-mix(in srgb, var(--color-primary, #4a9eff) 30%, transparent);
  cursor: pointer;
}

.cell--hovered-invalid {
  fill: color-mix(in srgb, var(--color-danger, #e54c4c) 30%, transparent);
  cursor: not-allowed;
}

.map-canvas__path {
  stroke: color-mix(in srgb, var(--color-fg, #fff) 15%, var(--color-bg));
  stroke-width: 0.8;
}

.preview-range {
  fill: color-mix(in srgb, var(--color-primary, #4a9eff) 8%, transparent);
  stroke: color-mix(in srgb, var(--color-primary, #4a9eff) 60%, transparent);
  stroke-width: 0.08;
  pointer-events: none;
}

.preview-range--invalid {
  fill: color-mix(in srgb, var(--color-danger, #e54c4c) 8%, transparent);
  stroke: color-mix(in srgb, var(--color-danger, #e54c4c) 60%, transparent);
}

.preview-marker {
  fill: var(--color-primary, #4a9eff);
  opacity: 0.7;
  pointer-events: none;
}

.preview-marker--invalid {
  fill: var(--color-danger, #e54c4c);
}

.tower {
  stroke: rgba(0, 0, 0, 0.4);
  stroke-width: 0.06;
  cursor: pointer;
}

.tower--selected {
  stroke: var(--color-primary, #4a9eff);
  stroke-width: 0.12;
}

.tower-range {
  fill: color-mix(in srgb, var(--color-primary, #4a9eff) 6%, transparent);
  stroke: color-mix(in srgb, var(--color-primary, #4a9eff) 50%, transparent);
  stroke-width: 0.08;
  pointer-events: none;
}

.bloon {
  stroke: rgba(0, 0, 0, 0.55);
  stroke-width: 0.04;
  /* Smooth interpolation between ticks so bloons read as moving rather than
     teleporting. Vue re-renders re-pin the cx/cy attrs; the CSS transition
     animates the change. 0.1s matches the ~20Hz default tick rate. */
  transition:
    cx 0.1s linear,
    cy 0.1s linear;
}

.bloon--frozen {
  stroke: #fff;
  stroke-width: 0.1;
}

.map-canvas__info {
  position: absolute;
  top: var(--gap-sm);
  right: var(--gap-sm);
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-primary, #4a9eff);
  border-radius: var(--radius);
  padding: var(--gap-sm) var(--gap);
  min-width: 180px;
  z-index: 1;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-weight: 600;
}

.info-cell {
  font-size: 0.8em;
  color: var(--color-text-muted, var(--color-text));
}

.info-sell {
  font: inherit;
  cursor: pointer;
  padding: 6px var(--gap-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: calc(var(--radius) * 0.5);
  color: inherit;
}

.info-sell:hover {
  border-color: var(--color-primary, #4a9eff);
}
</style>
