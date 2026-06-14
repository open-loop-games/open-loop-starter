<!--
  CalendarHeader — canon's right-rail clock: year, season, day-of-season, and
  the active season's catnip swing (spring +50% … winter −75%). Reads the
  calendar module directly; mounts post-start with the rest of the game view.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { getCalendar } from '../../modules';

const calendar = getCalendar();

// (mult − 1) as a signed percentage; neutral seasons (×1.0) show nothing.
const catnipSwing = computed(() => {
  const pct = Math.round((calendar.catnipMultiplier.value - 1) * 100);
  return pct === 0 ? null : pct;
});
</script>

<template>
  <div class="calendar-header">
    <span class="calendar-header__year">Year {{ calendar.year.value + 1 }}</span>
    <span class="calendar-header__season">
      {{ calendar.season.value.name }}, day {{ calendar.dayOfSeason.value + 1 }}
    </span>
    <span
      v-if="catnipSwing !== null"
      class="calendar-header__swing"
      :data-tone="catnipSwing > 0 ? 'good' : 'bad'"
    >
      catnip {{ catnipSwing > 0 ? '+' : '' }}{{ catnipSwing }}%
    </span>
  </div>
</template>

<style scoped>
.calendar-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--gap-xs) var(--gap-sm);
  padding-bottom: var(--gap-sm);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
.calendar-header__year {
  font-weight: 600;
}
.calendar-header__season {
  color: var(--color-text-muted);
}
.calendar-header__swing {
  margin-left: auto;
  font-weight: 600;
}
.calendar-header__swing[data-tone='good'] {
  color: var(--color-success);
}
.calendar-header__swing[data-tone='bad'] {
  color: var(--color-danger);
}
</style>
