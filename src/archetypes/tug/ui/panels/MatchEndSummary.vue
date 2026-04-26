<script setup lang="ts">
import { computed } from 'vue';
import { useMatch, useMeta, useTugData } from '../../composables';

/**
 * Match-end overlay. Sources its display state from `useMatch().lastMatchEnd`
 * (the latched `'matchEnded'` event payload), NOT from `match.outcome.value` —
 * which is null again post-reset (outcome is null after every reset). Restart
 * button calls `match.start()` then clears the latch.
 */
const match = useMatch();
const meta = useMeta();
const data = useTugData();

const payload = computed(() => match.lastMatchEnd.value);
const visible = computed(() => payload.value !== null);

const outcomeLabel = computed(() => {
  const o = payload.value?.outcome;
  if (o === 'player-win') return `${data.theme.factionNames[0]} victory`;
  if (o === 'ai-win') return `${data.theme.factionNames[1]} victory`;
  if (o === 'time-limit') return 'Time limit — match draw';
  return '';
});

function elapsedLabel(elapsedSec: number): string {
  const sec = Math.floor(elapsedSec);
  const min = Math.floor(sec / 60);
  return `${min}m ${String(sec % 60).padStart(2, '0')}s`;
}

function restart(): void {
  match.start();
  match.clearLastMatchEnd();
}
</script>

<template>
  <div
    v-if="visible"
    class="match-end"
    role="dialog"
    aria-modal="true"
  >
    <div class="match-end__panel">
      <h2 class="match-end__title">
        {{ outcomeLabel }}
      </h2>
      <dl class="match-end__stats">
        <div>
          <dt>Match length</dt>
          <dd>{{ elapsedLabel(payload!.elapsedSec) }}</dd>
        </div>
        <div>
          <dt>Units sent</dt>
          <dd>{{ payload!.unitsSent }}</dd>
        </div>
        <div>
          <dt>Counter pivots</dt>
          <dd>{{ payload!.counterPivots }}</dd>
        </div>
        <div>
          <dt>Lifetime matches</dt>
          <dd>{{ meta.matchesPlayed.value }}</dd>
        </div>
        <div>
          <dt>Best counter pivots</dt>
          <dd>{{ meta.maxCounterPivotsAnyMatch.value }}</dd>
        </div>
      </dl>
      <button
        class="match-end__restart"
        @click="restart"
      >
        Start next match
      </button>
    </div>
  </div>
</template>

<style scoped>
.match-end {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--modal-z-base, 100);
}

.match-end__panel {
  min-width: 320px;
  max-width: 480px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--gap-lg);
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.match-end__title {
  margin: 0;
  font-size: 1.4em;
  text-align: center;
}

.match-end__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap-sm) var(--gap);
  margin: 0;
}

.match-end__stats > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.match-end__stats dt {
  font-size: 0.8em;
  color: var(--color-text-muted, var(--color-text));
}

.match-end__stats dd {
  margin: 0;
  font-size: 1.05em;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.match-end__restart {
  align-self: stretch;
  padding: var(--gap-sm) var(--gap);
  font: inherit;
  background: var(--color-primary, #4a9eff);
  color: var(--color-on-primary, white);
  border: none;
  border-radius: calc(var(--radius) * 0.75);
  cursor: pointer;
}

.match-end__restart:hover {
  filter: brightness(1.1);
}
</style>
