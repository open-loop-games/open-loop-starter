<script setup lang="ts">
import { computed } from 'vue';
import { AlertDialogAction } from 'reka-ui';
import { BlockingDialog } from '@/lib';
import { useMatch } from '../../composables';
import { useModule } from '@/composables/useModule';
import { MetaKey } from '../../modules';

/**
 * Match-end overlay. Sources its display state from `useMatch().lastMatchEnd`
 * (the latched `'matchEnded'` event payload), NOT from `match.outcome.value` —
 * which is null again post-reset (outcome is null after every reset). Restart
 * button calls `match.start()` then clears the latch.
 *
 * BlockingDialog (not useModalStack): match-end is a blocking action — no ESC,
 * no overlay-click dismiss. Player must click "Start next match" to proceed.
 */
const match = useMatch();
const meta = useModule(MetaKey);

const payload = computed(() => match.lastMatchEnd.value);
const visible = computed(() => payload.value !== null);

const outcomeLabel = computed(() => {
  const o = payload.value?.outcome;
  if (o === 'player-win') return 'Terran victory';
  if (o === 'ai-win') return 'Protoss victory';
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
  <BlockingDialog
    :open="visible"
    :title="outcomeLabel"
  >
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
    <AlertDialogAction
      class="match-end__restart"
      @click="restart"
    >
      Start next match
    </AlertDialogAction>
  </BlockingDialog>
</template>

<style scoped>
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
