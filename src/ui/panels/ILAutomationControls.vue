<script setup lang="ts">
import { computed } from 'vue';
import { useModule } from '@/composables/useModule';
import {
  IdleLoopsKey,
  RECOMMENDATION_TIERS,
  currentRecommendationTier,
  nextRecommendationTier,
} from '@/modules/mods/idle-loops';
import Select, { type SelectOption } from '@/ui/components/Select.vue';

const il = useModule(IdleLoopsKey);

const earnedCount = computed(() => il.achievements.earnedCount.value);

const activeTier = computed(() => currentRecommendationTier(earnedCount.value));
const upcomingTier = computed(() => nextRecommendationTier(earnedCount.value));

const goalOptions = computed<SelectOption[]>(() => {
  const entries = il.bestOf.entries.value;
  return Object.keys(entries).map((key) => ({
    value: key,
    label: metricLabel(key),
  }));
});

const goalMetric = computed({
  get: () => il.selectedGoalMetric.value,
  set: (v: string) => {
    il.selectedGoalMetric.value = v;
  },
});

const autoApplyModel = computed({
  get: () => il.recommendations.autoApply.value,
  set: (v: boolean) => {
    il.recommendations.autoApply.value = v;
  },
});

function metricLabel(key: string): string {
  if (key.endsWith('-xp')) {
    const stat = key.slice(0, -3).toUpperCase();
    return `${stat} XP`;
  }
  return key;
}
</script>

<template>
  <section class="il-panel">
    <header class="il-panel__header">
      <h3>Automation</h3>
      <span class="il-panel__tier">{{ activeTier.label }}</span>
    </header>

    <div class="il-panel__row">
      <label class="il-control">
        <input
          v-model="autoApplyModel"
          type="checkbox"
        >
        Auto-apply recommendations
      </label>
    </div>

    <div class="il-panel__row">
      <label class="il-control">
        <span class="il-control__label">Goal metric</span>
        <Select
          v-model="goalMetric"
          :options="goalOptions"
          aria-label="Goal metric"
          placeholder="Select metric…"
        />
      </label>
    </div>

    <div
      v-if="upcomingTier"
      class="il-panel__next"
    >
      Next unlock: <strong>{{ upcomingTier.label }}</strong>
      <span class="muted">
        ({{ earnedCount }}/{{ upcomingTier.achievementsRequired }} achievements)
      </span>
      <p class="il-panel__next-desc">
        {{ upcomingTier.description }}
      </p>
    </div>

    <details class="il-panel__ladder">
      <summary>Tier ladder</summary>
      <ol class="il-ladder">
        <li
          v-for="tier in RECOMMENDATION_TIERS"
          :key="tier.id"
          :class="{
            unlocked: earnedCount >= tier.achievementsRequired,
            active: tier.id === activeTier.id,
          }"
        >
          <span class="il-ladder__label">{{ tier.label }}</span>
          <span class="il-ladder__req">{{ tier.achievementsRequired }}★</span>
          <span class="il-ladder__desc">{{ tier.description }}</span>
        </li>
      </ol>
    </details>
  </section>
</template>

<style scoped>
.il-panel {
  padding: var(--gap);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm, 8px);
}
.il-panel__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.il-panel__header h3 {
  margin: 0;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted, var(--color-muted));
}
.il-panel__tier {
  font-size: 0.85em;
  color: var(--color-accent, #4a6cf7);
  font-weight: 600;
}
.il-panel__row {
  font-size: 0.85em;
}
.il-control {
  display: flex;
  align-items: center;
  gap: var(--gap-sm, 8px);
  cursor: pointer;
}
.il-control__label {
  min-width: 6.5em;
  color: var(--color-text-muted, var(--color-muted));
  font-size: 0.85em;
}
.il-panel__next {
  font-size: 0.85em;
  padding: var(--gap-sm, 8px);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm, 4px);
}
.il-panel__next strong {
  color: var(--color-accent, #4a6cf7);
}
.il-panel__next .muted {
  color: var(--color-text-muted, var(--color-muted));
  font-size: 0.9em;
  margin-left: 4px;
}
.il-panel__next-desc {
  margin: 4px 0 0;
  color: var(--color-text-muted, var(--color-muted));
  font-size: 0.9em;
  line-height: 1.3;
}
.il-panel__ladder summary {
  cursor: pointer;
  font-size: 0.8em;
  color: var(--color-text-muted, var(--color-muted));
  padding: 2px 0;
}
.il-ladder {
  list-style: none;
  padding: 0;
  margin: var(--gap-sm, 8px) 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.il-ladder li {
  display: grid;
  grid-template-columns: 8em auto 1fr;
  gap: 8px;
  align-items: center;
  padding: 3px 6px;
  font-size: 0.8em;
  border-radius: var(--radius-sm, 4px);
  opacity: 0.55;
}
.il-ladder li.unlocked {
  opacity: 1;
}
.il-ladder li.active {
  background: color-mix(in srgb, var(--color-accent, #4a6cf7) 12%, transparent);
}
.il-ladder__label {
  font-weight: 600;
}
.il-ladder__req {
  color: var(--color-text-muted, var(--color-muted));
  font-variant-numeric: tabular-nums;
}
.il-ladder__desc {
  color: var(--color-text-muted, var(--color-muted));
  font-size: 0.95em;
}
</style>
