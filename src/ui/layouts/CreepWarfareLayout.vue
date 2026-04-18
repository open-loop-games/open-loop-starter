<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { CreepWarfareKey } from '@/modules/mods/creep-vs-creep';
import {
  FACTION_IDS,
  FACTION_NAMES,
  META_CURRENCY_NAME,
  PLAYER_FACTION,
  ROUND_LENGTH_S,
  type FactionId,
  type GoalId,
} from '@/modules/mods/creep-vs-creep/content';
import EndOfRoundPanel from '@/ui/panels/EndOfRoundPanel.vue';

const state = useModule(CreepWarfareKey);

const phase = computed(() => state.round.phase.value);
const timeLeft = computed(() =>
  Math.max(0, Math.ceil(ROUND_LENGTH_S - state.round.elapsed.value)),
);
const meta = computed(() => format(Decimal.floor(state.round.metaCurrency.value)));
const capacity = computed(() => state.goals.capacity.value);
const previewReward = computed(() => format(state.round.previewReward.value));

const territory = computed(() => {
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
  format(Decimal.floor(state.essence[PLAYER_FACTION].value)),
);

const selectedGoals = computed(
  () => state.goals.slots[PLAYER_FACTION].selected.value as readonly GoalId[],
);
const goalPool = computed(() => state.goals.goalPoolFor(PLAYER_FACTION));

function toggleGoal(goalId: GoalId) {
  const slot = state.goals.slots[PLAYER_FACTION];
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
          <span class="label">{{ META_CURRENCY_NAME }}</span>
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

      <section class="standings">
        <h3>Territory</h3>
        <div
          v-for="f in FACTION_IDS"
          :key="f"
          class="row"
          :class="{ player: f === PLAYER_FACTION }"
        >
          <span class="label">{{ FACTION_NAMES[f] }}</span>
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
</style>
