<script setup lang="ts">
/**
 * TownColumn — full town column. Structure matches OMSI reference
 * (index.html:280-315):
 *
 *   ◀ {zone.name} ▶
 *   {zone.description}
 *   ─── town stat rows (progress + regular vars) ───
 *   ─── action tile grid ───
 *
 * First-arc port: single Actions tab (no Stories/Guilds — the first-arc port doesn't
 * model the story system or DungeonGuildPanel). Tab switcher dropped.
 *
 * Reference: idle-loops-ng/src/ui/components/TownColumn.vue,
 * idle-loops-omsi/loops/index.html:280-315.
 */

import { computed, onBeforeUnmount } from 'vue';
import { Decimal, type DecimalSource, formatWhole, toNumber } from '@open-loop/engine';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { HoverCardRoot, HoverCardTrigger, HoverCardPortal, HoverCardContent } from 'reka-ui';
import Button from '@/ui/components/Button.vue';
import {
  getZoneSystem,
  getCurrentZone,
  getProgressVarsForZone,
  getProgressPercent,
  getRegularVarsForZone,
} from '../../modules/zones';
import { getActionRegistry, isActionVisible } from '../../modules/action-runner';
import { computeAdjustedTicks } from '../../modules/action-formulas';
import { addAction, getQueueAddAmount } from '../../modules/action-queue';
import { ZONES } from '../../data/zones';
import type { ActionDef } from '../../data/types';
import { ActionTooltipContent } from '../../composables/tooltips/actionTooltips';
import { AVAILABLE_ACTION_DRAG_TYPE } from '../next-action-drag';

const zones = getZoneSystem();
const actionRegistry = getActionRegistry();
const queueAddAmount = getQueueAddAmount();

const zoneDescriptions = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {};
  for (const z of ZONES) out[z.id] = z.description;
  return out;
});

// ── Zone nav ─────────────────────────────────────────────────────────────────

const unlockedZones = computed(() =>
  zones.ordered.value.filter((z) => zones.unlocked.value.includes(z.id)),
);

const currentZoneDef = computed(() => {
  const id = getCurrentZone();
  return unlockedZones.value.find((z) => z.id === id) ?? unlockedZones.value[0] ?? null;
});

const currentZoneDescription = computed(() => {
  const id = currentZoneDef.value?.id;
  return id ? (zoneDescriptions.value[id] ?? '') : '';
});

function cycleZone(direction: 1 | -1) {
  const list = unlockedZones.value;
  if (list.length === 0) return;
  const current = getCurrentZone();
  const idx = list.findIndex((z) => z.id === current);
  const nextIdx = (idx + direction + list.length) % list.length;
  zones.select(list[nextIdx].id);
}

// ── Town stat rows (progress + regular vars) ────────────────────────────────

const progressVars = computed(() => getProgressVarsForZone(getCurrentZone()));
const regularVars = computed(() => getRegularVarsForZone(getCurrentZone()));

function levelDisplay(pv: { level: { value: DecimalSource } }): string {
  return formatWhole(pv.level.value);
}

function xpProgressPercent(name: string): number {
  return getProgressPercent(name) * 100;
}

function levelPercent(pv: { level: { value: DecimalSource } }): number {
  return Math.min(100, Decimal.floor(pv.level.value).toNumber());
}

// ── Stat pie ─────────────────────────────────────────────────────────────────

interface PieSlice {
  d: string;
  stat: string;
}

/**
 * Build SVG arc path data for a stat weight pie. Starts at 12 o'clock,
 * rotates clockwise.
 *
 * Reference: dmchurch views/main.view.js:1237 createTownAction.
 */
function buildStatPie(weights: Record<string, DecimalSource>): PieSlice[] {
  const entries = Object.entries(weights)
    .map(([s, w]) => [s, toNumber(w)] as const)
    .filter(([, w]) => w > 0)
    .sort(([, a], [, b]) => b - a);

  // Normalize to a 0-1 ratio if weights don't already sum to 1.
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return [];

  const slices: PieSlice[] = [];
  let cumulative = 0;
  let lastX = 0,
    lastY = -1;

  for (const [stat, weight] of entries) {
    const ratio = weight / total;
    cumulative += ratio;
    const angle = cumulative * Math.PI * 2;
    const endX = Math.sin(angle);
    const endY = -Math.cos(angle);
    const largeArc = ratio >= 0.5 ? 1 : 0;
    const d = `M0,0 L${lastX.toFixed(4)},${lastY.toFixed(4)} A1,1 0,${largeArc},1 ${endX.toFixed(4)},${endY.toFixed(4)} Z`;
    slices.push({ d, stat: stat.toLowerCase() });
    lastX = endX;
    lastY = endY;
  }
  return slices;
}

// ── Action grid ──────────────────────────────────────────────────────────────

interface ActionTile {
  def: ActionDef;
  locked: boolean;
  manaCost: string;
}

const actionTiles = computed<ActionTile[]>(() => {
  const zoneId = getCurrentZone();
  return actionRegistry
    .getAll()
    .filter((def) => def.zoneId === zoneId && isActionVisible(def))
    .map((def) => ({
      def,
      locked: false,
      manaCost: formatWhole(computeAdjustedTicks(def)),
    }));
});

function handleTileClick(tile: ActionTile) {
  if (tile.locked) return;
  addAction(tile.def.id, Math.max(1, queueAddAmount.value));
}

// ── pdnd draggable registration (cross-column drop onto next-list) ──────────

const tileBindings = new WeakMap<HTMLElement, () => void>();
const boundTiles = new Set<HTMLElement>();

function bindTile(el: Element | null, actionId: string) {
  if (!(el instanceof HTMLElement)) return;
  if (tileBindings.has(el)) return;
  const cleanup = draggable({
    element: el,
    canDrag: () => !(actionTiles.value.find((t) => t.def.id === actionId)?.locked ?? true),
    getInitialData: () => ({ type: AVAILABLE_ACTION_DRAG_TYPE, actionId }),
    onDragStart: () => el.classList.add('is-dragging'),
    onDrop: () => el.classList.remove('is-dragging'),
  });
  tileBindings.set(el, cleanup);
  boundTiles.add(el);
}

onBeforeUnmount(() => {
  boundTiles.forEach((el) => tileBindings.get(el)?.());
  boundTiles.clear();
});
</script>

<template>
  <div class="town-column">
    <!-- Zone nav header -->
    <div class="zone-nav">
      <Button
        class="nav-arrow"
        :disabled="unlockedZones.length < 2"
        aria-label="Previous zone"
        @click="cycleZone(-1)"
      >
        ◀
      </Button>
      <div class="zone-name-block">
        <div class="zone-name">
          {{ currentZoneDef?.name ?? '—' }}
        </div>
        <div v-if="currentZoneDescription" class="zone-description">
          {{ currentZoneDescription }}
        </div>
      </div>
      <Button
        class="nav-arrow"
        :disabled="unlockedZones.length < 2"
        aria-label="Next zone"
        @click="cycleZone(1)"
      >
        ▶
      </Button>
    </div>

    <!-- Town stat rows -->
    <div v-if="progressVars.length > 0 || regularVars.length > 0" class="town-stats">
      <div v-for="pv in progressVars" :key="pv.name" class="town-stat-row">
        <div class="tsr-header">
          <span class="tsr-name">{{ pv.name }}</span>
          <span class="tsr-level">{{ levelDisplay(pv) }}%</span>
        </div>
        <div class="tsr-bars">
          <div class="bar-track level-track">
            <div class="bar-fill level-fill" :style="{ width: levelPercent(pv) + '%' }" />
          </div>
          <div class="bar-track xp-track">
            <div class="bar-fill xp-fill" :style="{ width: xpProgressPercent(pv.name) + '%' }" />
          </div>
        </div>
      </div>

      <div v-for="rv in regularVars" :key="rv.name" class="town-stat-row regular">
        <div class="tsr-header">
          <span class="tsr-name">{{ rv.name }}</span>
          <div class="tsr-right">
            <span class="tsr-flow">
              {{ rv.goodTemp.value }} &larr; {{ rv.good.value }} &larr;
              {{ rv.total.value - rv.checked.value }}
            </span>
            <label
              class="tsr-toggle"
              :title="`Burn known-good ${rv.name.toLowerCase()} before exploring new ones.`"
            >
              <input v-model="rv.valuablesFirst.value" type="checkbox" />
              <span>Lootable first</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Action grid -->
    <div class="tab-body">
      <div class="action-grid">
        <HoverCardRoot
          v-for="tile in actionTiles"
          :key="tile.def.id"
          :open-delay="300"
          :close-delay="100"
        >
          <HoverCardTrigger as-child>
            <Button
              :ref="(el) => bindTile(el as Element | null, tile.def.id)"
              class="action-tile"
              :class="{ locked: tile.locked }"
              :disabled="tile.locked"
              @click="handleTileClick(tile)"
            >
              <svg class="action-stat-pie" viewBox="-1 -1 2 2" aria-hidden="true">
                <path
                  v-for="slice in buildStatPie(tile.def.weights)"
                  :key="slice.stat"
                  :d="slice.d"
                  class="action-stat-pie-slice"
                />
              </svg>
              <span class="action-name">{{ tile.def.name }}</span>
              <span class="action-cost">{{ tile.manaCost }}</span>
            </Button>
          </HoverCardTrigger>
          <HoverCardPortal>
            <HoverCardContent class="hovercard action-hovercard" :side-offset="8">
              <ActionTooltipContent :def="tile.def" :locked="tile.locked" />
            </HoverCardContent>
          </HoverCardPortal>
        </HoverCardRoot>
        <div v-if="actionTiles.length === 0" class="empty-state">
          No actions unlocked in this zone.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.town-column {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
  flex: 1 1 auto;
}

.zone-nav {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding-bottom: var(--gap-sm);
  border-bottom: 1px solid var(--color-border);
}

.nav-arrow {
  flex: 0 0 auto;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 4px 10px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.9em;
}

.nav-arrow:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.nav-arrow:disabled {
  opacity: 0.4;
  cursor: default;
}

.zone-name-block {
  flex: 1 1 auto;
  text-align: center;
  min-width: 0;
}

.zone-name {
  font-size: 1.1em;
  font-weight: 700;
}

.zone-description {
  font-size: 0.75em;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.town-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.town-stat-row {
  padding: 2px 0;
}

.tsr-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.82em;
}

.tsr-name {
  font-weight: 600;
}

.tsr-level {
  font-weight: 700;
  color: var(--color-primary);
}

.tsr-flow {
  font-size: 0.82em;
  font-weight: 600;
  color: var(--color-text-muted);
}

.tsr-right {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-sm);
}

.tsr-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: var(--gap-sm);
  font-size: 0.75em;
  color: var(--color-text-muted);
  cursor: pointer;
  user-select: none;
}

.tsr-toggle input {
  width: 12px;
  height: 12px;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

.tsr-bars {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}

.bar-track {
  height: 6px;
  background: var(--color-bg);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.15s linear;
  border-radius: 3px;
}

.level-fill {
  background: var(--color-primary);
  opacity: 0.5;
}

.xp-fill {
  background: var(--color-success);
}

.tab-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.action-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-content: flex-start;
}

.action-tile {
  position: relative;
  width: 102px;
  height: 50px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 4px 6px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  color: var(--color-text);
  text-align: center;
  transition: background-color 0.1s linear;
}

.action-tile:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.action-tile.locked,
.action-tile:disabled {
  opacity: 0.5;
  cursor: default;
}

.action-tile.is-dragging {
  opacity: 0.6;
}

.action-stat-pie {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  opacity: 0.65;
  pointer-events: none;
}

.action-stat-pie-slice {
  fill: var(--color-primary);
  stroke: var(--color-bg);
  stroke-width: 0.04;
}

.action-name {
  font-size: 0.78em;
  font-weight: 600;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.action-cost {
  font-size: 0.68em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

:global(.action-hovercard) {
  min-width: 240px;
  max-width: 320px;
}

:global(.att) {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

:global(.att-desc) {
  font-size: 0.9em;
  color: var(--color-text-muted);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 2px;
}

:global(.att-stat-table) {
  width: 100%;
  border-collapse: collapse;
}

:global(.att-stat-table td) {
  padding: 1px 3px;
  font-size: 0.82em;
  font-variant-numeric: tabular-nums;
}

:global(.att-sn) {
  font-weight: 700;
  min-width: 36px;
}

:global(.att-sw) {
  color: var(--color-text-muted);
}

:global(.att-sl) {
  color: var(--color-text-muted);
}

:global(.att-sf) {
  color: var(--color-text);
  text-align: right;
}

:global(.att-mana) {
  font-size: 0.82em;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
  border-top: 1px solid var(--color-border);
  padding-top: 3px;
  margin-top: 1px;
}

:global(.att-row) {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.82em;
}

:global(.att-label) {
  color: var(--color-text-muted);
}

:global(.att-val) {
  font-variant-numeric: tabular-nums;
}

:global(.att-type) {
  color: var(--color-text-muted);
  font-size: 0.8em;
}

:global(.att-locked) {
  gap: 6px;
}

:global(.att-unlock-hint) {
  font-size: 0.88em;
  color: var(--color-text-muted);
  font-style: italic;
}

:global(.att-stat-keys) {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.82em;
}

:global(.att-stat-key--primary) {
  font-weight: 700;
}

.empty-state {
  width: 100%;
  font-size: 0.82em;
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--gap);
}
</style>
