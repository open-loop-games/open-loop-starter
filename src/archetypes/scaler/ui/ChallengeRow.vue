<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import Button from '@/ui/components/Button.vue';
import type { ScalerChallengeDef } from '../data';
import {
  getCoinResource,
  getChallengesCategory,
  challengeRequirement,
  eccTranscend,
} from '../modules';

const props = defineProps<{
  def: ScalerChallengeDef;
}>();

const coins = getCoinResource();
const cat = getChallengesCategory();

const challenge = computed(() => cat?.getChallenge(props.def.id));
const isActive = computed(() => challenge.value?.active.value ?? false);
const completions = computed(() => challenge.value?.completions.value ?? 0);
const isMaxed = computed(() => challenge.value?.maxed.value ?? false);

const requirement = computed(() => challengeRequirement(props.def.index, completions.value));
const ecc = computed(() => eccTranscend(completions.value));

const goalProgress = computed(() => {
  const have = coins.value;
  const need = requirement.value;
  if (Decimal.lte(need, 0)) return 1;
  return Math.min(1, Decimal.div(have, need).toNumber());
});

function doToggle(): void {
  challenge.value?.toggle();
}
</script>

<template>
  <div
    class="challenge-row"
    :data-active="isActive"
  >
    <div class="challenge-row__head">
      <strong class="challenge-row__name">{{ def.name }} ({{ def.index }})</strong>
      <span class="challenge-row__completions"> {{ completions }}/{{ def.completionLimit }} </span>
      <span
        v-if="isMaxed"
        class="challenge-row__maxed"
      >MAXED</span>
    </div>
    <p class="challenge-row__flavor">
      {{ def.flavor }}
    </p>
    <p class="challenge-row__restrictions">
      {{ def.restrictions }}
    </p>
    <div class="challenge-row__stats">
      <span>
        Goal: <strong>{{ format(requirement, 0) }}</strong> coins
      </span>
      <span>
        ECC: <strong>{{ ecc.toFixed(2) }}</strong>
      </span>
      <span class="challenge-row__progress"> progress {{ (goalProgress * 100).toFixed(1) }}% </span>
    </div>
    <Button
      :disabled="isMaxed"
      class="challenge-row__action"
      @click="doToggle"
    >
      <span v-if="isActive">Exit Challenge</span>
      <span v-else-if="isMaxed">Maxed</span>
      <span v-else>Enter Challenge</span>
    </Button>
  </div>
</template>

<style scoped>
.challenge-row {
  display: flex;
  flex-direction: column;
  gap: var(--gap-xs);
  padding: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.challenge-row[data-active='true'] {
  border-color: var(--color-accent, var(--color-text));
}
.challenge-row__head {
  display: flex;
  align-items: baseline;
  gap: var(--gap-sm);
  flex-wrap: wrap;
}
.challenge-row__name {
  min-width: 12em;
}
.challenge-row__completions {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  font-size: 0.85em;
}
.challenge-row__maxed {
  color: var(--color-accent, var(--color-text));
  font-weight: 700;
  font-size: 0.8em;
  letter-spacing: 0.05em;
  margin-left: auto;
}
.challenge-row__flavor,
.challenge-row__restrictions {
  margin: 0;
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.challenge-row__restrictions {
  font-style: italic;
}
.challenge-row__stats {
  display: flex;
  gap: var(--gap-sm);
  flex-wrap: wrap;
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
}
.challenge-row__progress {
  margin-left: auto;
}
.challenge-row__action {
  align-self: flex-start;
}
</style>
