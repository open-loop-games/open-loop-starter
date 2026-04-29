import { computed } from 'vue';
import {
  Decimal,
  createAchievementCategory,
  tunable,
  type AchievementCategory,
  type EngineModule,
  type Grant,
  type InjectionKey,
} from 'open-loop-engine';
import type { AchievementDef, AmbientData, AmbientGameState } from '../data/types';
import {
  AllRateChainsKey,
  AmbientTuningRegistryKey,
  AutoProducersKey,
  HeadlineRateKey,
  PrimaryLifetimeKey,
  PrimaryResourceKey,
} from './auto-producers';
import { UnlocksKey } from './unlocks';
import { SceneKey } from './scene';
import { SessionClockKey } from './session-clock';

export const AchievementsKey: InjectionKey<AchievementCategory<AchievementDef>> = Symbol(
  'ambient/achievements',
) as InjectionKey<AchievementCategory<AchievementDef>>;

/**
 * Ambient's achievement category. Each `AchievementDef.requirement` closure is
 * lowered into a Vue `computed` that reads predicate methods on `state`; those
 * methods read `.value` on injection-key refs (primary, lifetime, scene zones,
 * session-clock writable refs), so reactivity flows naturally — no `ctx.onLoad`
 * walk needed for `triggeredOnResume` entries. AppRoot writes
 * `sessionClock.lastResumeGapSec.value` post-load, the resume-flagged
 * predicates re-evaluate, and the category fires earned through its existing
 * watcher path. The flag is data-side metadata (a hint about *when* the
 * predicate becomes true), not a separate evaluation channel.
 */
export function createAchievementsModule(data: AmbientData): EngineModule {
  return {
    id: 'ambient/achievements',
    dependencies: [
      'ambient/auto-producers',
      'ambient/unlocks',
      'ambient/scene',
      'ambient/session-clock',
    ],
    install(ctx) {
      const buildings = ctx.inject(AutoProducersKey);
      const unlocks = ctx.inject(UnlocksKey);
      const scene = ctx.inject(SceneKey);
      const primary = ctx.inject(PrimaryResourceKey);
      const primaryLifetime = ctx.inject(PrimaryLifetimeKey);
      const headlineRate = ctx.inject(HeadlineRateKey);
      const sessionClock = ctx.inject(SessionClockKey);
      const allChains = ctx.inject(AllRateChainsKey);
      const tuningRegistry = ctx.inject(AmbientTuningRegistryKey);

      const state: AmbientGameState = {
        primaryAtLeast: (amount) => Decimal.gte(primary.value, amount),
        primaryLifetimeAtLeast: (amount) => Decimal.gte(primaryLifetime.value, amount),
        perSecondAtLeast: (amount) => Decimal.gte(headlineRate.value, amount),
        producerCountAtLeast: (id, count) => {
          const p = buildings.getProducer(id);
          if (!p) return false;
          return Decimal.gte(p.count.value, count);
        },
        unlockVisible: (id) => unlocks.getPurchasable(id)?.bought.value ?? false,
        sceneVariantUnlocked: (id) => scene.zones.isUnlocked(id),
        ownsEveryProducer: () =>
          data.producers.every((p) => {
            const producer = buildings.getProducer(p.id);
            return producer ? Decimal.gte(producer.count.value, 1) : false;
          }),
        secondsSinceLastResume: () => sessionClock.secondsSinceLastResume.value,
        secondsSinceCreation: () => sessionClock.secondsSinceCreation.value,
        offlineGapAtLeast: (seconds) => sessionClock.lastResumeGapSec.value >= seconds,
      };

      const achievementMultiplier = tunable(
        tuningRegistry,
        'balance/achievementMultiplier',
        () => data.balance.achievementMultiplier,
      );

      const achievements = createAchievementCategory<AchievementDef>({
        id: 'ambient/achievements',
        mapAchievement: (def) => {
          const grants: Grant[] = [
            {
              chain: allChains,
              mult: def.rewardMultiplier ?? achievementMultiplier,
              description: def.name,
            },
          ];
          return {
            display: {
              title: def.name,
              description: def.description,
            },
            requirement: computed(() => def.requirement(state)),
            hidden: def.hidden ?? false,
            grants,
          };
        },
      });
      achievements.register(data.achievements);

      ctx.provide(AchievementsKey, achievements);
    },
  };
}
