import { computed } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { Achievement, AchievementCategory, InjectionKey } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { AchievementDef } from '../data/types';

// TODO(expansion): near-identical to producer/composables/useAchievements.ts.
// Graduate to src/composables/ when a third archetype lands its own copy.

export interface AchievementRow {
  def: AchievementDef;
  earned: Ref<boolean>;
  earnedAt: Ref<number | null>;
  visible: ComputedRef<boolean>;
  achievement: Achievement;
}

export interface AchievementSummary {
  rows: AchievementRow[];
  earnedCount: ComputedRef<number>;
  total: number;
}

export function useAchievements(
  categoryKey: InjectionKey<AchievementCategory<AchievementDef>>,
): ComputedRef<AchievementSummary> {
  const achievements = useModule(categoryKey);

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
