<script setup lang="ts">
import { computed } from 'vue';
import { SCALER_CHALLENGES } from '../data';
import { getAutobuyerToggles, getChallengesCategory } from '../modules';
import ChallengeRow from './ChallengeRow.vue';

const toggles = getAutobuyerToggles();
const cat = getChallengesCategory();

const allMaxed = computed(() => cat?.allMaxed.value ?? false);
const activeName = computed(() => {
  const a = cat?.active.value;
  if (!a) return null;
  const def = SCALER_CHALLENGES.find((d) => d.id === a.id);
  return def?.name ?? a.id;
});
</script>

<template>
  <div class="challenges-panel">
    <header class="challenges-panel__head">
      <h3>Transcend Challenges</h3>
      <p>
        Voluntarily nerf production for a stacking permanent reward. Goal-met-on-tick auto-completes
        the challenge and exits; per-completion ECC softcap rewards bind into the relevant rateChain
        on every cycle.
      </p>
      <p
        v-if="activeName"
        class="challenges-panel__active"
      >
        Active: <strong>{{ activeName }}</strong>
      </p>
      <p
        v-if="allMaxed"
        class="challenges-panel__maxed"
      >
        All challenges maxed.
      </p>
    </header>

    <section class="challenges-panel__autobuyer">
      <label class="challenges-panel__toggle">
        <input
          v-model="toggles.challengeSweep.value"
          type="checkbox"
        >
        Auto-sweep (enter next unmaxed challenge when none active)
      </label>
    </section>

    <section class="challenges-panel__rows">
      <ChallengeRow
        v-for="def in SCALER_CHALLENGES"
        :key="def.id"
        :def="def"
      />
    </section>
  </div>
</template>

<style scoped>
.challenges-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
}
.challenges-panel__head h3 {
  margin: 0 0 var(--gap-xs) 0;
  font-size: 0.95em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.challenges-panel__head p {
  margin: 0 0 var(--gap-xs) 0;
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.challenges-panel__active {
  font-size: 0.85em;
}
.challenges-panel__maxed {
  font-weight: 700;
  color: var(--color-accent, var(--color-text));
}
.challenges-panel__autobuyer {
  padding: var(--gap-sm) var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.challenges-panel__toggle {
  display: flex;
  align-items: center;
  gap: var(--gap-xs);
  font-size: 0.85em;
  cursor: pointer;
}
.challenges-panel__rows {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}
</style>
