<script setup lang="ts">
/**
 * Town column — replaces the tabbed `ActionDrawerPanel`. Layout matches the
 * idle-loops-ng `TownColumn` shape:
 *
 *   ◀ {zone.name} ▶
 *   {zone.description}
 *   ─── progressVar bars (level + XP-fill into next) ───
 *   ─── regularVar pool rows (goodTemp ← good ← unchecked) ───
 *   ─── action tile grid (visible-prereqs filtered, hover detail) ───
 *
 * The ◀▶ arrows cycle through `data.zones` order; two zones today, but the
 * cycler scales without UI rework when forks raise zone count.
 *
 * The XP-fraction calculation uses the closed-form vanilla idle-loops
 * progressVar curve (`xpForLevel(N) = 50 × N × (N+1)`) — same curve the
 * progress-vars module's `xpToLevel` formula inverts. Closed-form keeps the
 * panel free of engine Formula imports.
 */
import { computed, onBeforeUnmount, ref } from 'vue';
import { Decimal } from 'open-loop-engine';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import ProgressBar from '@/ui/components/ProgressBar.vue';
import Tooltip from '@/ui/components/Tooltip.vue';
import { useFormatting } from '@/composables/useFormatting';
import { useModule } from '@/composables/useModule';
import { ProgressVarsKey, RegularVarsKey } from '../../modules';
import { useActions } from '../../composables/useActions';
import { useLooperData } from '../../composables/useLooperData';
import { useQueue } from '../../composables/useQueue';
import { AVAILABLE_ACTION_DRAG_TYPE } from '../queue-drag';

const data = useLooperData();
const progressVars = useModule(ProgressVarsKey);
const regularVars = useModule(RegularVarsKey);
const actions = useActions();
const queue = useQueue();
const { format } = useFormatting();

// Boot default — first zone in registration order. Zone selection is local
// UI state; modules' `ZonesKey.current` is unused in the canonical 2-zone
// shape (zones don't gate, so there's no reason to globalize the selection).
const currentZoneId = ref(data.zones[0]?.id ?? '');

const currentZone = computed(
  () => data.zones.find((z) => z.id === currentZoneId.value) ?? data.zones[0] ?? null,
);

function cycleZone(direction: 1 | -1): void {
  const list = data.zones;
  if (list.length === 0) return;
  const idx = list.findIndex((z) => z.id === currentZoneId.value);
  const nextIdx = (idx + direction + list.length) % list.length;
  currentZoneId.value = list[nextIdx].id;
}

// ─── ProgressVar rows ───────────────────────────────────────────────────────

interface ProgressRow {
  id: string;
  name: string;
  description: string;
  level: number;
  xp: number;
  xpForCurrent: number;
  xpForNext: number;
  fraction: number;
}

function xpForLevel(level: number): number {
  // Vanilla idle-loops progressVar curve: level = floor((sqrt(8x/100+1)-1)/2)
  // Inverse: xpForLevel(N) = 50 × N × (N+1). Documented at
  // modules/progress-vars.ts:51-53.
  return 50 * level * (level + 1);
}

const zoneProgressRows = computed<ProgressRow[]>(() => {
  const zoneId = currentZoneId.value;
  return data.progressVars
    .filter((def) => def.zoneId === zoneId)
    .map((def) => {
      const skill = progressVars.getSkill(def.id);
      const xpRaw = skill ? new Decimal(skill.xp.value).toNumber() : 0;
      const lvlRaw = skill ? Math.floor(new Decimal(skill.level.value).toNumber()) : 0;
      const base = xpForLevel(lvlRaw);
      const next = xpForLevel(lvlRaw + 1);
      const span = Math.max(1, next - base);
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        level: lvlRaw,
        xp: xpRaw,
        xpForCurrent: base,
        xpForNext: next,
        fraction: Math.max(0, Math.min(1, (xpRaw - base) / span)),
      };
    });
});

// ─── RegularVar pool rows ───────────────────────────────────────────────────

interface PoolRow {
  id: string;
  name: string;
  description: string;
  total: number;
  checked: number;
  good: number;
  goodTemp: number;
  unchecked: number;
}

const zonePoolRows = computed<PoolRow[]>(() => {
  const zoneId = currentZoneId.value;
  return data.regularVars
    .filter((def) => def.zoneId === zoneId)
    .map((def) => {
      const state = regularVars.getState(def.id);
      const total = state ? new Decimal(state.total.value).toNumber() : 0;
      const checked = state?.checked.value ?? 0;
      const good = state?.good.value ?? 0;
      const goodTemp = state?.goodTemp.value ?? 0;
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        total,
        checked,
        good,
        goodTemp,
        unchecked: Math.max(0, total - checked),
      };
    });
});

// ─── Action tiles ───────────────────────────────────────────────────────────

const visibleActionRows = computed(() => actions.visibleRowsByZone(currentZoneId.value).value);

function enqueue(actionId: string): void {
  queue.enqueue(actionId, 1);
}

// Cross-column drag: each tile registers as a pdnd draggable source carrying
// its action id. The ActionColumnPanel's edit list listens for this drag
// type and inserts the action at the drop position. Click-to-enqueue still
// works in parallel — drag is additive, not exclusive.
const tileBindings = new WeakMap<HTMLElement, () => void>();
const boundTiles = new Set<HTMLElement>();

function bindTile(el: Element | null, actionId: string, locked: boolean): void {
  if (!(el instanceof HTMLElement)) return;
  if (tileBindings.has(el)) return;
  const cleanup = draggable({
    element: el,
    canDrag: () => !locked,
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
  <section
    class="town-column"
    data-testid="town-column"
  >
    <header class="town-zone-nav">
      <button
        class="town-zone-nav__arrow"
        :disabled="data.zones.length < 2"
        data-testid="zone-prev"
        aria-label="Previous zone"
        @click="cycleZone(-1)"
      >
        ◀
      </button>
      <div class="town-zone-nav__name">
        <h3 data-testid="zone-name">
          {{ currentZone?.name ?? '—' }}
        </h3>
        <p
          v-if="currentZone?.description"
          class="town-zone-nav__desc"
        >
          {{ currentZone.description }}
        </p>
      </div>
      <button
        class="town-zone-nav__arrow"
        :disabled="data.zones.length < 2"
        data-testid="zone-next"
        aria-label="Next zone"
        @click="cycleZone(1)"
      >
        ▶
      </button>
    </header>

    <div
      v-if="zoneProgressRows.length > 0"
      class="town-progress"
    >
      <div
        v-for="row in zoneProgressRows"
        :key="row.id"
        class="town-progress__row"
        :data-testid="`progress-${row.id}`"
      >
        <header class="town-progress__head">
          <span class="town-progress__name">{{ row.name }}</span>
          <span class="town-progress__level">
            <span class="town-progress__level-label">lvl</span>
            <strong>{{ row.level }}</strong>
          </span>
        </header>
        <ProgressBar
          :value="row.fraction"
          :max="1"
        />
        <p class="town-progress__xp">
          {{ format(row.xp - row.xpForCurrent, 0) }} /
          {{ format(row.xpForNext - row.xpForCurrent, 0) }} xp
        </p>
      </div>
    </div>

    <div
      v-if="zonePoolRows.length > 0"
      class="town-pools"
    >
      <h4 class="town-pools__heading">
        Pools
      </h4>
      <div
        v-for="row in zonePoolRows"
        :key="row.id"
        class="town-pools__row"
        :data-testid="`pool-${row.id}`"
      >
        <Tooltip>
          <span class="town-pools__name">{{ row.name }}</span>
          <template #content>
            <strong>{{ row.name }}</strong>
            <p>{{ row.description }}</p>
            <p>
              <strong>{{ row.goodTemp }}</strong> rewards left this loop ·
              <strong>{{ row.good }}</strong> known · <strong>{{ row.unchecked }}</strong> still to
              find
            </p>
          </template>
        </Tooltip>
        <span class="town-pools__counts">
          <span
            class="town-pools__counts-now"
            :class="{ 'is-zero': row.goodTemp <= 0 }"
            :data-testid="`pool-${row.id}-good-temp`"
          >{{ row.goodTemp }}</span>
          <span class="town-pools__counts-sep">←</span>
          <span :data-testid="`pool-${row.id}-good`">{{ row.good }}</span>
          <span class="town-pools__counts-sep">←</span>
          <span :data-testid="`pool-${row.id}-unchecked`">{{ row.unchecked }}</span>
        </span>
      </div>
    </div>

    <div class="town-actions">
      <h4 class="town-actions__heading">
        Actions
      </h4>
      <ul
        v-if="visibleActionRows.length > 0"
        class="town-actions__grid"
      >
        <li
          v-for="row in visibleActionRows"
          :key="row.def.id"
          class="town-actions__item"
        >
          <Tooltip>
            <button
              :ref="(el) => bindTile(el as Element | null, row.def.id, !row.unlocked.value)"
              class="action-tile"
              :data-testid="`enqueue-${row.def.id}`"
              :disabled="!row.unlocked.value"
              @click="enqueue(row.def.id)"
            >
              <span class="action-tile__name">{{ row.def.name }}</span>
              <span class="action-tile__cost">{{ format(row.adjustedTicks.value, 0) }}t</span>
            </button>
            <template #content>
              <strong>{{ row.def.name }}</strong>
              <p class="tile-tooltip__desc">
                {{ row.def.description }}
              </p>
              <p class="tile-tooltip__cost">
                <span>cost {{ format(row.adjustedTicks.value, 0) }}t</span>
                <span class="muted">(base {{ format(row.def.manaCost, 0) }})</span>
              </p>
              <p class="tile-tooltip__weights">
                <span
                  v-for="(weight, capId) in row.def.weights"
                  :key="capId"
                  class="tile-tooltip__weight"
                >
                  {{ capId }} ×{{ format(weight, 2) }}
                </span>
              </p>
              <p
                v-if="row.timesCompleted.value > 0"
                class="tile-tooltip__count"
              >
                completed × {{ row.timesCompleted.value }}
              </p>
            </template>
          </Tooltip>
        </li>
      </ul>
      <p
        v-else
        class="town-actions__empty"
      >
        Nothing here yet. Keep playing — actions unlock as you progress.
      </p>
    </div>
  </section>
</template>

<style scoped>
.town-column {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  min-height: 0;
  padding: var(--gap);
  background: var(--color-surface-alt, var(--color-surface));
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.town-zone-nav {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  padding-bottom: var(--gap-sm);
  border-bottom: 1px solid var(--color-border);
}

.town-zone-nav__arrow {
  flex: 0 0 auto;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, var(--radius));
  color: var(--color-text);
  padding: 4px 10px;
  cursor: pointer;
  font-size: 0.95em;
}

.town-zone-nav__arrow:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.town-zone-nav__arrow:disabled {
  opacity: 0.35;
  cursor: default;
}

.town-zone-nav__name {
  flex: 1 1 auto;
  text-align: center;
  min-width: 0;
}

.town-zone-nav__name h3 {
  margin: 0;
  font-size: 1.05em;
  font-weight: 700;
}

.town-zone-nav__desc {
  margin: 2px 0 0 0;
  font-size: 0.78em;
  color: var(--color-text-muted, var(--color-text));
  font-style: italic;
}

.town-progress {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.town-progress__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.town-progress__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.town-progress__name {
  font-weight: 600;
  font-size: 0.9em;
}

.town-progress__level {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
}

.town-progress__level-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78em;
  color: var(--color-text-muted, var(--color-text));
}

.town-progress__xp {
  margin: 0;
  font-size: 0.75em;
  color: var(--color-text-muted, var(--color-text));
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.town-pools {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, var(--radius));
}

.town-pools__heading,
.town-actions__heading {
  margin: 0 0 4px 0;
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, var(--color-text));
}

.town-pools__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.85em;
  gap: var(--gap-sm);
}

.town-pools__name {
  font-weight: 500;
  cursor: help;
  border-bottom: 1px dotted var(--color-border);
}

.town-pools__counts {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted, var(--color-text));
}

.town-pools__counts-now {
  font-weight: 700;
  color: var(--color-primary, var(--color-text));
}

.town-pools__counts-now.is-zero {
  color: var(--color-text-muted, var(--color-text));
  font-weight: 500;
}

.town-pools__counts-sep {
  font-size: 0.85em;
  opacity: 0.65;
}

.town-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 auto;
  min-height: 0;
}

.town-actions__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
  align-content: start;
  overflow-y: auto;
  min-height: 0;
}

.town-actions__item {
  display: contents;
}

.action-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 10px;
  min-height: 56px;
  background: var(--color-bg, transparent);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, var(--radius));
  cursor: pointer;
  font-family: inherit;
  color: var(--color-text);
  text-align: center;
  transition:
    background-color 0.1s linear,
    border-color 0.1s linear;
  width: 100%;
}

.action-tile:hover:not(:disabled) {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, transparent);
  color: var(--color-primary);
}

.action-tile:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.action-tile__name {
  font-size: 0.9em;
  font-weight: 600;
  line-height: 1.1;
}

.action-tile__cost {
  font-size: 0.75em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted, var(--color-text));
}

.action-tile:hover:not(:disabled) .action-tile__cost {
  color: var(--color-primary);
}

.town-actions__empty {
  color: var(--color-text-muted, var(--color-text));
  font-style: italic;
  text-align: center;
  margin: var(--gap) 0;
  font-size: 0.85em;
}

.tile-tooltip__desc {
  margin: 4px 0;
  font-size: 0.85em;
  color: var(--color-text-muted, var(--color-text));
}

.tile-tooltip__cost {
  margin: 2px 0;
  font-size: 0.85em;
  display: flex;
  gap: 6px;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
}

.tile-tooltip__cost .muted {
  color: var(--color-text-muted, var(--color-text));
  font-size: 0.85em;
}

.tile-tooltip__weights {
  margin: 2px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.78em;
  color: var(--color-text-muted, var(--color-text));
}

.tile-tooltip__weight {
  text-transform: capitalize;
  font-variant-numeric: tabular-nums;
}

.tile-tooltip__count {
  margin: 4px 0 0 0;
  font-size: 0.78em;
  font-style: italic;
  color: var(--color-text-muted, var(--color-text));
}
</style>
