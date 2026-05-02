<!--
  Scaler-side achievements modal. Wraps the shared AchievementGrid widget
  and feeds it cells from useAchievements(AchievementsKey). Theming is
  intentionally minimal — the cell styles inherit from AchievementGrid's
  defaults; a costume pass overlays scaler-specific visuals later.
-->
<script setup lang="ts">
import { computed } from 'vue';
import AchievementGrid, { type AchievementGridCell } from '@/ui/components/AchievementGrid.vue';
import { useAchievements } from '../../composables/useAchievements';
import { AchievementsKey } from '../../modules';

const summary = useAchievements(AchievementsKey);
defineEmits<{ close: [] }>();

const cells = computed<AchievementGridCell[]>(() =>
  summary.value.rows.map((row) => ({
    id: row.def.id,
    name: row.visible.value ? row.def.name : '???',
    description: row.visible.value ? row.def.description : 'Hidden — keep ascending to reveal',
    earned: row.earned.value,
    hidden: !row.visible.value,
  })),
);
</script>

<template>
  <AchievementGrid
    title="Achievements"
    :cells="cells"
    @close="$emit('close')"
  >
    <template #summary="{ earnedCount, total, fillPct }">
      <div class="scaler-awards-summary">
        <div class="scaler-awards-summary__count">
          <span class="scaler-awards-summary__earned">{{ earnedCount }}</span>
          <span class="scaler-awards-summary__sep">of</span>
          <span class="scaler-awards-summary__total">{{ total }}</span>
          <span class="scaler-awards-summary__label">earned</span>
        </div>
        <div
          class="scaler-awards-summary__bar"
          role="progressbar"
          :aria-valuenow="earnedCount"
          :aria-valuemax="total"
        >
          <div
            class="scaler-awards-summary__bar-fill"
            :style="{ width: `${fillPct}%` }"
          />
        </div>
      </div>
    </template>
    <template #cell="{ cell }">
      <div class="scaler-award">
        <div class="scaler-award__name">
          {{ cell.name }}
        </div>
        <div class="scaler-award__desc">
          {{ cell.description }}
        </div>
      </div>
    </template>
  </AchievementGrid>
</template>

<style scoped>
.scaler-awards-summary {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
}
.scaler-awards-summary__count {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 6px;
}
.scaler-awards-summary__earned {
  font-weight: 800;
  font-size: 1.4em;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.scaler-awards-summary__sep {
  color: var(--color-text-muted);
  font-style: italic;
  font-size: 0.95em;
}
.scaler-awards-summary__total {
  font-weight: 700;
  font-size: 1.1em;
  font-variant-numeric: tabular-nums;
}
.scaler-awards-summary__label {
  margin-left: 8px;
  color: var(--color-text-muted);
  font-size: 0.85em;
  letter-spacing: 0.04em;
}
.scaler-awards-summary__bar {
  height: 4px;
  background: var(--color-border);
  border-radius: 999px;
  overflow: hidden;
}
.scaler-awards-summary__bar-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 240ms ease-out;
}
.scaler-award {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.scaler-award__name {
  font-weight: 600;
  color: var(--color-text);
}
.scaler-award__desc {
  font-size: 0.85em;
  color: var(--color-text-muted);
  line-height: 1.4;
}
</style>
