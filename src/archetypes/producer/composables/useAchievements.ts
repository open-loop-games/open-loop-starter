import { computed, inject, type ComputedRef, type Ref } from 'vue';
import type { Achievement, Engine } from 'open-loop-engine';
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
  const engine = inject<Engine>('engine');
  const achievements = engine?.tryInject(AchievementsKey);
  if (!achievements) {
    throw new Error('useAchievements() called outside an active producer engine');
  }

  return computed(() => {
    const rows: AchievementRow[] = achievements.getAll().map((entry) => ({
      def: entry.def,
      earned: entry.achievement.earned as unknown as Ref<boolean>,
      earnedAt: entry.achievement.earnedAt as unknown as Ref<number | null>,
      visible: computed(() => !entry.def.hidden || entry.achievement.earned.value),
      achievement: entry.achievement,
    }));
    return {
      rows,
      earnedCount: achievements.earnedCount as unknown as ComputedRef<number>,
      total: achievements.totalCount,
    };
  });
}
