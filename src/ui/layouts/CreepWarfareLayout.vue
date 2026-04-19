<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, triggerRef } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { CreepWarfareKey } from '@/modules/mods/creep-vs-creep';
import {
  FACTION_IDS,
  type CellState,
  type FactionId,
  type GoalId,
} from '@/modules/mods/creep-vs-creep/content';
import DomGrid from '@/ui/components/spatial/DomGrid.vue';
import EndOfRoundPanel from '@/ui/panels/EndOfRoundPanel.vue';

const state = useModule(CreepWarfareKey);

const phase = computed(() => state.round.phase.value);
const timeLeft = computed(() =>
  Math.max(0, Math.ceil(state.vars.archetype.roundLengthSec - state.round.elapsed.value)),
);
const meta = computed(() => format(Decimal.floor(state.round.metaCurrency.value)));
const capacity = computed(() => state.goals.capacity.value);
const previewReward = computed(() => format(state.round.previewReward.value));

const cellVersion = shallowRef(0);
const offCellChanged = state.grid.grid.on('cellChanged', () => {
  cellVersion.value++;
  triggerRef(cellVersion);
});
onScopeDispose(() => offCellChanged());

const territory = computed(() => {
  void cellVersion.value;
  const counts: Record<FactionId, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
  const g = state.grid.grid;
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      const o = g.at(x, y).owner;
      if (o !== null) counts[o]++;
    }
  }
  return counts;
});

const playerEssence = computed(() =>
  format(Decimal.floor(state.essence[state.vars.archetype.playerFaction].value)),
);

const selectedGoals = computed(
  () => state.goals.slots[state.vars.archetype.playerFaction].selected.value as readonly GoalId[],
);
const goalPool = computed(() => state.goals.goalPoolFor(state.vars.archetype.playerFaction));

function cellClass(cell: CellState): string[] {
  const classes: string[] = [`cw-cell-terrain-${cell.terrain}`];
  if (cell.owner !== null) classes.push(`cw-cell-owner-${cell.owner}`);
  if (cell.hotspotId !== undefined) classes.push('cw-cell-hotspot');
  return classes;
}

function toggleGoal(goalId: GoalId) {
  const slot = state.goals.slots[state.vars.archetype.playerFaction];
  if (slot.isSelected(goalId)) {
    slot.deselect(goalId);
  } else {
    slot.select(goalId);
  }
}

function endRoundNow() {
  state.round.endRound();
}
</script>

<template>
  <div class="cw-layout">
    <EndOfRoundPanel v-if="phase === 'ended'" />

    <div
      v-else
      class="active-round"
    >
      <section class="status">
        <div class="stat">
          <span class="label">Round time left</span>
          <span class="value">{{ timeLeft }}s</span>
        </div>
        <div class="stat">
          <span class="label">{{ state.vars.theme.metaCurrencyName }}</span>
          <span class="value">{{ meta }}</span>
        </div>
        <div class="stat">
          <span class="label">Player essence</span>
          <span class="value">{{ playerEssence }}</span>
        </div>
        <div class="stat">
          <span class="label">Preview reward</span>
          <span class="value">+{{ previewReward }}</span>
        </div>
      </section>

      <section class="map-view">
        <h3>Battlefield</h3>
        <div class="map-viewport">
          <DomGrid
            :grid="state.grid.grid"
            :cell-class="cellClass"
            :cell-size="6"
          />
        </div>
      </section>

      <section class="standings">
        <h3>Territory</h3>
        <div
          v-for="f in FACTION_IDS"
          :key="f"
          class="row"
          :class="{ player: f === state.vars.archetype.playerFaction }"
        >
          <span class="label">{{ state.vars.theme.factionNames[f] }}</span>
          <span class="value">{{ territory[f] }} cells</span>
        </div>
      </section>

      <section class="goals">
        <h3>Your Goals ({{ selectedGoals.length }} / {{ capacity }})</h3>
        <div class="goal-grid">
          <button
            v-for="goalId in goalPool"
            :key="goalId"
            class="goal-btn"
            :class="{ selected: selectedGoals.includes(goalId) }"
            @click="toggleGoal(goalId)"
          >
            {{ goalId }}
          </button>
        </div>
      </section>

      <button
        class="btn-primary end-btn"
        @click="endRoundNow"
      >
        End Round Now
      </button>
    </div>
  </div>
</template>

<style scoped>
.cw-layout {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  flex: 1;
  min-height: 0;
}
.active-round {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}
.status {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.stat {
  display: flex;
  flex-direction: column;
  min-width: 140px;
}
.standings,
.goals {
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.standings h3,
.goals h3 {
  font-size: 1em;
  margin: 0 0 var(--gap-sm);
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}
.row.player .label {
  color: var(--color-primary);
  font-weight: 600;
}
.label {
  color: var(--color-text-muted);
  font-size: 0.85em;
}
.value {
  font-weight: 600;
}
.goal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--gap-sm);
}
.goal-btn {
  padding: var(--gap-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 0.85em;
}
.goal-btn.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, var(--color-surface));
  color: var(--color-primary);
}
.end-btn {
  align-self: flex-start;
}

.map-view {
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.map-view h3 {
  font-size: 1em;
  margin: 0 0 var(--gap-sm);
}
.map-viewport {
  display: inline-block;
  background: var(--color-bg, #111);
  padding: 2px;
  border-radius: var(--radius);
  line-height: 0;
}

/*
 * :deep() reaches into the DomGrid child component to paint its cells.
 * The terrain/ownership classes are passed via the `cellClass` prop, so
 * they land on child-component DOM that this component's scoped styles
 * would otherwise not match.
 */

/* Terrain baseline colors. */
:deep(.cw-cell-terrain-open) {
  background: #2a2a2a;
}
:deep(.cw-cell-terrain-rock) {
  background: #555;
}
:deep(.cw-cell-terrain-spawn) {
  background: #444;
  outline: 1px solid #888;
  outline-offset: -1px;
}
:deep(.cw-cell-terrain-hotspot) {
  background: #6a5a1a;
  box-shadow: inset 0 0 0 1px #caa040;
}

/* Faction ownership overlays (applied in addition to terrain). */
:deep(.cw-cell-owner-red) {
  background: #b03030;
}
:deep(.cw-cell-owner-blue) {
  background: #3060b8;
}
:deep(.cw-cell-owner-green) {
  background: #2e9a4a;
}
:deep(.cw-cell-owner-yellow) {
  background: #c6a820;
}

/* Owned hotspot: terrain outline stays for legibility. */
:deep(.cw-cell-hotspot.cw-cell-owner-red),
:deep(.cw-cell-hotspot.cw-cell-owner-blue),
:deep(.cw-cell-hotspot.cw-cell-owner-green),
:deep(.cw-cell-hotspot.cw-cell-owner-yellow) {
  box-shadow: inset 0 0 0 1px #ffd770;
}

/* Rock is impassable — never owned, but defend against stale state. */
:deep(.cw-cell-terrain-rock.cw-cell-owner-red),
:deep(.cw-cell-terrain-rock.cw-cell-owner-blue),
:deep(.cw-cell-terrain-rock.cw-cell-owner-green),
:deep(.cw-cell-terrain-rock.cw-cell-owner-yellow) {
  background: #555;
}
</style>
