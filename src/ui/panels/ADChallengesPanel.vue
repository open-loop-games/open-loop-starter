<script setup lang="ts">
import { computed } from 'vue';
import { Decimal, format } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { AntimatterDimensionsKey } from '@/modules/mods/antimatter-dimensions';
import type { Challenge } from 'open-loop-engine';
import type { ADChallengeDef } from '@/modules/mods/antimatter-dimensions/content';

const ad = useModule(AntimatterDimensionsKey);

const GOAL_LOG10 = 650;

interface CardRow {
  id: string;
  name: string;
  description: string;
  restriction: string;
  active: boolean;
  completed: boolean;
  canStart: boolean;
  goalLabel: string;
  progressPct: number;
  progressLabel: string;
}

function progressPct(antimatter: Decimal): number {
  if (Decimal.lte(antimatter, 1)) return 0;
  const logAm = Decimal.log10(antimatter).toNumber();
  if (!Number.isFinite(logAm)) return 100;
  return Math.max(0, Math.min(100, (logAm / GOAL_LOG10) * 100));
}

function rowFor(ch: Challenge, def: ADChallengeDef): CardRow {
  const am = Decimal.fromValue(ad.antimatter.value);
  const pct = progressPct(am);
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    restriction: def.restriction,
    active: ch.active.value,
    completed: ch.completed.value,
    canStart: ch.canStart.value,
    goalLabel: `1e${GOAL_LOG10} antimatter`,
    progressPct: pct,
    progressLabel: `${format(Decimal.floor(am))} / 1e${GOAL_LOG10}`,
  };
}

const rows = computed<CardRow[]>(() =>
  ad.challenges.getAll().map((entry) => rowFor(entry.challenge, entry.def)),
);

function onToggle(id: string): void {
  const ch = ad.challenges.getChallenge(id);
  if (!ch) return;
  if (ch.active.value) {
    ch.exit();
  } else if (ch.canStart.value) {
    ch.enter();
  }
}
</script>

<template>
  <section class="ad-challenges-panel">
    <h3>Infinity Challenges</h3>
    <p class="hint">
      Entering a challenge performs an Infinity reset. Completions grant a permanent ×1.3 multiplier to all Antimatter Dimensions and persist through every reset.
    </p>
    <div class="challenge-grid">
      <div
        v-for="row in rows"
        :key="row.id"
        :class="['challenge-card', { active: row.active, completed: row.completed }]"
      >
        <div class="info">
          <div class="head-row">
            <span class="name">{{ row.name }}</span>
            <span
              v-if="row.completed"
              class="badge badge-done"
            >Completed</span>
            <span
              v-else-if="row.active"
              class="badge badge-active"
            >Active</span>
          </div>
          <span class="desc">{{ row.description }}</span>
          <span class="restriction">While active: {{ row.restriction }}</span>
          <span class="goal">Goal: {{ row.goalLabel }}</span>
        </div>
        <div class="progress">
          <div class="bar">
            <div
              class="fill"
              :style="{ width: row.progressPct + '%' }"
            />
          </div>
          <span class="progress-label">{{ row.progressLabel }}</span>
        </div>
        <button
          type="button"
          class="btn-sm"
          :disabled="!row.active && !row.canStart"
          @click="onToggle(row.id)"
        >
          {{ row.active ? 'Exit' : row.completed ? 'Re-enter' : 'Enter' }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ad-challenges-panel h3 {
  font-size: 1em;
  margin-bottom: var(--gap-sm);
}
.hint {
  font-size: 0.85em;
  color: var(--color-text-muted);
  margin: 0 0 var(--gap-sm) 0;
}
.challenge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--gap-sm);
}
.challenge-card {
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
  padding: var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.challenge-card.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}
.challenge-card.completed {
  border-color: var(--color-primary);
}
.info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-sm);
}
.name {
  font-weight: 600;
}
.desc {
  font-size: 0.85em;
  color: var(--color-text-muted);
}
.restriction {
  font-size: 0.85em;
}
.goal {
  font-size: 0.8em;
  color: var(--color-text-muted);
}
.badge {
  font-size: 0.7em;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}
.badge-active {
  background: var(--color-primary);
  color: var(--color-surface);
  border-color: var(--color-primary);
}
.badge-done {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bar {
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 120ms linear;
}
.progress-label {
  font-size: 0.75em;
  color: var(--color-text-muted);
}
</style>
