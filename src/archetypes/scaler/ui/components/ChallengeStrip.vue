<!--
  Transcend challenges (5 rows). Each entry shows the challenge name,
  in-challenge nerf, completion-reward, completion count, and an
  enter / exit / complete affordance keyed by current state.

  vanilla canonical: SynergismOfficial/src/Challenges.ts:209-236 — challenge
  effects + reward formulas. The slim port collapses each completion to a
  single multiplicative grant per Synergism's `CalcECC` (Challenges.ts:541-548);
  in-challenge nerfs are applied by the engine via the challenge's onEnter
  override-push and reverted on exit.

  Confirmation dialog for entering deferred — direct-enter for the slim port.
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { Challenge, ChallengeDef as EngineChallengeDef } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { ChallengesKey } from '../../modules';

const challenges = useModule(ChallengesKey);

interface ChallengeRow {
  def: EngineChallengeDef & { name?: string; effect?: string; reward?: string };
  challenge: Challenge;
}

const rows = computed<ChallengeRow[]>(() =>
  challenges.getAll().map((entry) => ({
    def: entry.def as ChallengeRow['def'],
    challenge: entry.challenge,
  })),
);

function rowState(row: ChallengeRow): 'active' | 'completable' | 'idle' | 'maxed' {
  if (row.challenge.maxed.value) return 'maxed';
  if (row.challenge.active.value) {
    return row.challenge.canComplete.value ? 'completable' : 'active';
  }
  return 'idle';
}

function actionLabel(row: ChallengeRow): string {
  switch (rowState(row)) {
    case 'maxed':
      return 'Maxed';
    case 'completable':
      return 'Complete';
    case 'active':
      return 'Exit';
    case 'idle':
      return 'Enter';
  }
}

function performAction(row: ChallengeRow): void {
  switch (rowState(row)) {
    case 'maxed':
      return;
    case 'completable':
      row.challenge.complete();
      return;
    case 'active':
      row.challenge.exit();
      return;
    case 'idle':
      row.challenge.enter();
      return;
  }
}
</script>

<template>
  <section class="scaler-challenges">
    <header class="scaler-challenges__head">
      <h4>Challenges</h4>
      <span class="scaler-challenges__total">{{ challenges.completedCount.value }} / {{ challenges.size }} completed</span>
    </header>
    <ul class="scaler-challenges__list">
      <li
        v-for="row in rows"
        :key="row.def.id"
        class="scaler-challenges__row"
        :data-state="rowState(row)"
      >
        <div class="scaler-challenges__row-head">
          <span class="scaler-challenges__row-name">{{ row.def.name ?? row.def.id }}</span>
          <span class="scaler-challenges__row-completions">
            {{ row.challenge.completions.value }} completed
          </span>
        </div>
        <p
          v-if="row.def.effect"
          class="scaler-challenges__row-effect"
        >
          <em>Inside:</em> {{ row.def.effect }}
        </p>
        <p
          v-if="row.def.reward"
          class="scaler-challenges__row-reward"
        >
          <em>Reward:</em> {{ row.def.reward }}
        </p>
        <button
          class="btn-sm scaler-challenges__row-action"
          :disabled="
            rowState(row) === 'maxed' || (rowState(row) === 'idle' && !row.challenge.canStart.value)
          "
          @click="performAction(row)"
        >
          {{ actionLabel(row) }}
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.scaler-challenges {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
}
.scaler-challenges__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.scaler-challenges__head h4 {
  margin: 0;
  font-size: 1em;
  font-weight: 700;
}
.scaler-challenges__total {
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.scaler-challenges__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--gap-sm);
}
.scaler-challenges__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--gap-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
.scaler-challenges__row[data-state='active'] {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary) inset;
}
.scaler-challenges__row[data-state='completable'] {
  border-color: var(--color-primary);
  background: var(--color-primary-soft, var(--color-surface));
}
.scaler-challenges__row[data-state='maxed'] {
  opacity: 0.6;
}
.scaler-challenges__row-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.scaler-challenges__row-name {
  font-weight: 700;
}
.scaler-challenges__row-completions {
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.scaler-challenges__row-effect,
.scaler-challenges__row-reward {
  margin: 0;
  font-size: 0.85em;
  color: var(--color-text-muted);
  line-height: 1.4;
}
.scaler-challenges__row-effect em,
.scaler-challenges__row-reward em {
  font-style: italic;
  color: var(--color-text);
  margin-right: 4px;
}
.scaler-challenges__row-action {
  align-self: flex-start;
  margin-top: 4px;
}
</style>
