import { unref } from 'vue';
import {
  createAchievementCategory,
  createMultiplicativeModifier,
  getCombinedAchievementEffect,
  toNumber,
  tunable,
  type Achievement,
  type AchievementCategory,
  type DecimalSource,
  type EngineModule,
} from 'open-loop-engine';
import type { AchievementDef, ProducerData } from '../data/types';
import { ProducerTuningRegistryKey, getBuildings } from './producers';

let achievements: AchievementCategory<AchievementDef, unknown>;

export function getAchievements(): AchievementCategory<AchievementDef, unknown> {
  return achievements;
}

export function createAchievementsModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/achievements',
    dependencies: ['producer/producers', 'producer/upgrades'],
    install(ctx) {
      const buildings = getBuildings();
      const tuningRegistry = ctx.inject(ProducerTuningRegistryKey);

      const achievementMultiplier = tunable<DecimalSource>(
        tuningRegistry,
        'balance/achievementMultiplier',
        () => data.balance.achievementMultiplier,
      );

      achievements = createAchievementCategory<AchievementDef>({
        id: 'producer/achievements',
        mapAchievement: (def) => ({
          display: { title: def.name, description: def.description },
          requirement: def.requirement,
          hidden: def.hidden ?? false,
          effect: (): number => {
            const raw = def.reward ?? unref(achievementMultiplier);
            return toNumber(raw);
          },
        }),
      });
      achievements.register(data.achievements);

      // G-M10 — one multiplicative modifier per rate chain over the cumulative
      // earned-achievement product. Replaces 30 per-achievement Grants on each
      // chain with a single binding whose getter folds the active set.
      const allAchievements = achievements
        .getAll()
        .map((entry) => entry.achievement) as Achievement<number>[];

      for (const def of data.producers) {
        const producer = buildings.getProducer(def.id);
        if (!producer) continue;
        producer.rateChain.bind({
          id: `achievements/${def.id}`,
          modifier: createMultiplicativeModifier({
            multiplier: () => getCombinedAchievementEffect(allAchievements),
            description: 'Achievements',
          }),
        });
      }
    },
  };
}
