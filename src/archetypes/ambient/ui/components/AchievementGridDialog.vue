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
    };
  }),
);
</script>

<template>
  <AchievementGrid
    title="Garden Almanac"
    :cells="cells"
    @close="$emit('close')"
  />
</template>
