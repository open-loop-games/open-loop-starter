import { computed } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { Achievement } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { AchievementDef } from '../data/types';
import { AchievementsKey } from '../modules';

export interface AchievementRow {
  def: AchievementDef;
  earned: Ref<boolean>;
  earnedAt: Ref<number | null>;
  /** Visible to the player — false for hidden-until-earned when not yet earned. */
  visible: ComputedRef<boolean>;
  achievement: Achievement;
}

export interface AchievementSummary {
  rows: AchievementRow[];
  earnedCount: ComputedRef<number>;
  total: number;
}

export function useAchievements(): ComputedRef<AchievementSummary> {
  const achievements = useModule(AchievementsKey);

  return computed(() => {
    const rows: AchievementRow[] = achievements.getAll().map((entry) => ({
      def: entry.def,
      earned: entry.achievement.earned,
      earnedAt: entry.achievement.earnedAt,
      visible: computed(() => !entry.def.hidden || entry.achievement.earned.value),
      achievement: entry.achievement,
    }));
    return {
      rows,
      earnedCount: achievements.earnedCount,
      total: achievements.totalCount,
    };
  });
}
