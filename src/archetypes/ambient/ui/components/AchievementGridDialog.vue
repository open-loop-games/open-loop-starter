<script setup lang="ts">
import { computed } from 'vue';
import AchievementGrid, { type AchievementGridCell } from '@/ui/components/AchievementGrid.vue';
import { useAchievements } from '../../composables/useAchievements';

const summary = useAchievements();
defineEmits<{ close: [] }>();

const cells = computed<AchievementGridCell[]>(() =>
  summary.value.rows.map((row) => ({
    id: row.def.id,
    name: row.visible.value ? row.def.name : '???',
    description: row.visible.value ? row.def.description : 'Hidden — earn to reveal',
    earned: row.earned.value,
  })),
);
</script>

<template>
  <AchievementGrid
    title="Garden Almanac"
    :cells="cells"
    @close="$emit('close')"
  />
</template>
