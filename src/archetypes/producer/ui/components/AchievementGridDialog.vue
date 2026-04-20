<script setup lang="ts">
import { computed } from 'vue';
import BaseModal from '@/ui/components/BaseModal.vue';
import { useAchievements } from '../../composables/useAchievements';

const summary = useAchievements();
defineEmits<{ close: [] }>();

const cells = computed(() =>
  summary.value.rows.map((row) => ({
    id: row.def.id,
    name: row.visible.value ? row.def.name : '???',
    description: row.visible.value ? row.def.description : 'Hidden — complete to reveal',
    earned: row.earned.value,
  })),
);
</script>

<template>
  <BaseModal
    title="Achievements"
    @close="$emit('close')"
  >
    <div class="achievement-summary">
      {{ summary.earnedCount.value }} / {{ summary.total }} earned
    </div>
    <ul class="achievement-grid">
      <li
        v-for="c in cells"
        :key="c.id"
        class="achievement-cell"
        :data-earned="c.earned ? 'true' : 'false'"
        :data-testid="`achievement-${c.id}`"
      >
        <div class="achievement-name">
          {{ c.name }}
        </div>
        <div class="achievement-desc">
          {{ c.description }}
        </div>
      </li>
    </ul>
  </BaseModal>
</template>

<style scoped>
.achievement-summary {
  margin-bottom: var(--gap);
  color: var(--color-text-muted);
  font-size: 0.9em;
}

.achievement-grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--gap-sm);
}

.achievement-cell {
  padding: var(--gap-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  min-height: 66px;
}

.achievement-cell[data-earned='true'] {
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.achievement-name {
  font-weight: 600;
  font-size: 0.9em;
  margin-bottom: 2px;
}

.achievement-desc {
  font-size: 0.78em;
  color: var(--color-text-muted);
}
</style>
