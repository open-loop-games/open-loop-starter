<script setup lang="ts">
import { computed } from 'vue';
import AchievementGrid, { type AchievementGridCell } from '@/ui/components/AchievementGrid.vue';
import { getAchievements } from '../../modules';

const achievements = getAchievements();
defineEmits<{ close: [] }>();

const cells = computed<AchievementGridCell[]>(() =>
  achievements.getAll().map((entry) => {
    const visible = !entry.def.hidden || entry.achievement.earned.value;
    return {
      id: entry.def.id,
      name: visible ? entry.def.name : '???',
      description: visible ? entry.def.description : 'Hidden — earn to reveal',
      earned: entry.achievement.earned.value,
      hidden: !visible,
    };
  }),
);
</script>

<template>
  <AchievementGrid
    class="almanac-entries"
    title="Garden Almanac"
    :cells="cells"
    @close="$emit('close')"
  >
    <template #summary="{ earnedCount, total, fillPct }">
      <div class="entries-summary">
        <div class="entries-summary__count">
          <span class="entries-summary__earned">{{ earnedCount }}</span>
          <span class="entries-summary__sep">of</span>
          <span class="entries-summary__total">{{ total }}</span>
          <span class="entries-summary__label">entries pressed</span>
        </div>
        <div
          class="entries-summary__rule"
          role="progressbar"
          :aria-valuenow="earnedCount"
          :aria-valuemax="total"
        >
          <div class="entries-summary__rule-fill" :style="{ width: `${fillPct}%` }" />
        </div>
      </div>
    </template>

    <template #cell="{ cell }">
      <div class="entry-card__seal" aria-hidden="true">
        <span class="entry-card__seal-mark">&#10038;</span>
      </div>
      <div class="entry-card__body">
        <div class="entry-card__name">
          {{ cell.name }}
        </div>
        <div class="entry-card__desc">
          {{ cell.description }}
        </div>
      </div>
    </template>
  </AchievementGrid>
</template>

<style scoped>
/* ─── Summary header ─────────────────────────────────────────────────── */
.entries-summary {
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--almanac-rule-soft, rgba(168, 158, 139, 0.32));
}

.entries-summary__count {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--font-display, Georgia, serif);
  color: var(--almanac-evergreen, var(--color-text));
  margin-bottom: 8px;
}

.entries-summary__earned {
  font-style: italic;
  font-weight: 600;
  font-size: 1.9em;
  font-variant-numeric: tabular-nums oldstyle-nums;
  color: var(--almanac-evergreen, var(--color-text));
  line-height: 1;
}

.entries-summary__sep {
  font-style: italic;
  font-family: var(--font-body, Georgia, serif);
  color: var(--almanac-moss, var(--color-text-muted));
  font-size: 1em;
}

.entries-summary__total {
  font-style: italic;
  font-weight: 500;
  font-size: 1.25em;
  font-variant-numeric: tabular-nums oldstyle-nums;
  color: var(--almanac-evergreen, var(--color-text));
}

.entries-summary__label {
  margin-left: 10px;
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.92em;
  letter-spacing: 0.04em;
  color: var(--almanac-pencil, var(--color-text-muted));
}

.entries-summary__rule {
  height: 1px;
  background: var(--almanac-rule-soft, rgba(168, 158, 139, 0.32));
  position: relative;
  overflow: hidden;
}

.entries-summary__rule-fill {
  position: absolute;
  inset: 0 auto 0 0;
  height: 100%;
  background: var(--almanac-evergreen, var(--color-primary));
  transition: width 320ms ease-out;
  opacity: 0.7;
}

/* ─── Costume override on the shared cell chrome ─────────────────────── */
.almanac-entries :deep(.olui-achievement-grid__cells) {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.almanac-entries :deep(.olui-achievement-grid__cell) {
  position: relative;
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 10px;
  padding: 10px 12px;
  background: var(--almanac-cream, var(--color-surface));
  border: 1px solid var(--almanac-rule, var(--color-border));
  border-radius: 2px;
  min-height: 64px;
  font-family: var(--font-body, Georgia, serif);
  color: var(--almanac-evergreen, var(--color-text));
}

.almanac-entries :deep(.olui-achievement-grid__cell[data-earned='false']) {
  background: transparent;
  border-color: var(--almanac-rule-soft, rgba(168, 158, 139, 0.32));
}

.almanac-entries :deep(.olui-achievement-grid__cell[data-hidden-cell='true']) {
  background: repeating-linear-gradient(
    135deg,
    transparent 0,
    transparent 6px,
    rgba(168, 158, 139, 0.06) 6px,
    rgba(168, 158, 139, 0.06) 7px
  );
  border-style: dashed;
}

/* ─── Pressed-specimen mark column ───────────────────────────────────── */
.entry-card__seal {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px dashed var(--almanac-rule-soft, rgba(168, 158, 139, 0.5));
  border-radius: 1px;
  align-self: center;
  background: transparent;
  transition:
    background 200ms ease-out,
    border 200ms ease-out;
}

.entry-card__seal-mark {
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.05em;
  color: transparent;
  transition: color 200ms ease-out;
  transform: rotate(-8deg);
}

.almanac-entries :deep(.olui-achievement-grid__cell[data-earned='true']) .entry-card__seal {
  background: rgba(160, 65, 50, 0.08);
  border: 1px solid var(--almanac-stamp, var(--color-danger));
}

.almanac-entries :deep(.olui-achievement-grid__cell[data-earned='true']) .entry-card__seal-mark {
  color: var(--almanac-stamp, var(--color-danger));
  opacity: 0.85;
}

/* ─── Body text ──────────────────────────────────────────────────────── */
.entry-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.entry-card__name {
  font-family: var(--font-display, Georgia, serif);
  font-style: italic;
  font-weight: 500;
  font-size: 1.15em;
  color: var(--almanac-evergreen, var(--color-text));
  letter-spacing: 0.01em;
}

.almanac-entries :deep(.olui-achievement-grid__cell[data-earned='false']) .entry-card__name {
  color: var(--almanac-pencil, var(--color-text-muted));
  font-weight: 400;
}

.entry-card__desc {
  font-family: var(--font-body, Georgia, serif);
  font-style: italic;
  font-size: 0.92em;
  color: var(--almanac-moss, var(--color-text-muted));
  line-height: 1.45;
}

.almanac-entries :deep(.olui-achievement-grid__cell[data-earned='false']) .entry-card__desc {
  opacity: 0.75;
}
</style>
