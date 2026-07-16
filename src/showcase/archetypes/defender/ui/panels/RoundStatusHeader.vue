<script setup lang="ts">
import { computed } from 'vue';
import { displayResource } from '@open-loop/engine';
import Button from '@/ui/components/Button.vue';
import { BloonsKey, RoundKey } from '../../modules';
import { useModule } from '@/composables/useModule';

const round = useModule(RoundKey);
const bloons = useModule(BloonsKey);

const cashLabel = computed(() => displayResource(round.money));
const livesLabel = computed(() => round.lives.value.toLocaleString());
const roundLabel = computed(() => `${round.currentRound.value} / 10`);

// Start-round predicate: outcome is in-progress AND no in-flight bloons (the
// bloons module's wave-cleared event flips `bloonCount` to 0 + the wave-
// sequencer is drained at the same time, so this single check suffices).
const canStartRound = computed(
  () => round.outcome.value === 'in-progress' && bloons.bloonCount() === 0,
);

const startLabel = computed(() => `Start round ${round.currentRound.value}`);

function startRound(): void {
  round.startRound(round.currentRound.value);
}
</script>

<template>
  <div class="olui-surface round-status">
    <dl class="round-status__stats">
      <div>
        <dt>Cash</dt>
        <dd>{{ cashLabel }}</dd>
      </div>
      <div>
        <dt>Lives</dt>
        <dd>{{ livesLabel }}</dd>
      </div>
      <div>
        <dt>Round</dt>
        <dd>{{ roundLabel }}</dd>
      </div>
    </dl>
    <Button
      class="round-status__start"
      :disabled="!canStartRound"
      @click="startRound"
    >
      {{ startLabel }}
    </Button>
  </div>
</template>

<style scoped>
.round-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap);
  padding: var(--gap-sm) var(--gap);
}

.round-status__stats {
  display: flex;
  gap: var(--gap-lg);
  margin: 0;
  list-style: none;
}

.round-status__stats > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.round-status__stats dt {
  font-size: 0.8em;
  color: var(--color-text-muted, var(--color-text));
}

.round-status__stats dd {
  margin: 0;
  font-size: 1.1em;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.round-status__start {
  padding: var(--gap-sm) var(--gap);
  font-weight: 600;
}
</style>
