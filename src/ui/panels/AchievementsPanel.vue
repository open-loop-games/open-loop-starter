<script setup lang="ts">
import { progressionState } from '@/modules/progression';

const p = progressionState!;
const earnedCount = p.achievements.earnedCount;
const total = p.achievements.totalCount;
</script>

<template>
  <section class="achievements-panel">
    <h3>Achievements ({{ earnedCount }}/{{ total }})</h3>
    <div class="achievement-list">
      <div
        v-for="{ achievement: a } in p.achievements.getAll()"
        :key="a.id"
        class="achievement"
        :class="{ earned: a.earned.value }"
      >
        <div class="marker">
          {{ a.earned.value ? '✓' : '·' }}
        </div>
        <div class="info">
          <span class="title">{{ a.display.title }}</span>
          <span class="desc">{{ a.display.description }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.achievements-panel h3 {
  font-size: 1em;
  margin-bottom: var(--gap-sm);
}
.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.achievement {
  display: flex;
  align-items: center;
  gap: var(--gap);
  padding: var(--gap-sm) var(--gap);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  opacity: 0.55;
}
.achievement.earned {
  opacity: 1;
  border-color: var(--color-success);
}
.marker {
  font-weight: 700;
  width: 1em;
  text-align: center;
}
.info {
  display: flex;
  flex-direction: column;
}
.title {
  font-weight: 600;
  font-size: 0.9em;
}
.desc {
  font-size: 0.75em;
  color: var(--color-text-muted);
}
</style>
