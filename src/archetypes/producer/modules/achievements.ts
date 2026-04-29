import { computed } from 'vue';
import {
  Decimal,
  createAchievementCategory,
  tunable,
  type AchievementCategory,
  type DecimalSource,
  type EngineModule,
  type Grant,
  type InjectionKey,
} from 'open-loop-engine';
import type { AchievementDef, ProducerData, ProducerGameState } from '../data/types';
import {
  AllRateChainsKey,
  BuildingsKey,
  ClickStateKey,
  PrimaryLifetimeKey,
  PrimaryResourceKey,
  HeadlineRateKey,
  ProducerTuningRegistryKey,
} from './producers';
import { UpgradesKey } from './upgrades';

export const AchievementsKey: InjectionKey<AchievementCategory<AchievementDef>> = Symbol(
  'producer/achievements',
) as InjectionKey<AchievementCategory<AchievementDef>>;

export function createAchievementsModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/achievements',
    dependencies: ['producer/producers', 'producer/upgrades'],
    install(ctx) {
      const buildings = ctx.inject(BuildingsKey);
      const upgrades = ctx.inject(UpgradesKey);
      const primary = ctx.inject(PrimaryResourceKey);
      const primaryLifetime = ctx.inject(PrimaryLifetimeKey);
      const headlineRate = ctx.inject(HeadlineRateKey);
      const clickState = ctx.inject(ClickStateKey);
      const allChains = ctx.inject(AllRateChainsKey);
      const tuningRegistry = ctx.inject(ProducerTuningRegistryKey);

      // Live read view of module state, passed to data predicates. Methods
      // encapsulate Decimal comparisons so data/*.ts stays engine-free.
      const state: ProducerGameState = {
        primaryAtLeast: (amount) => Decimal.gte(primary.value, amount),
        primaryLifetimeAtLeast: (amount) => Decimal.gte(primaryLifetime.value, amount),
        perSecondAtLeast: (amount) => Decimal.gte(headlineRate.value, amount),
        producerCountAtLeast: (id, count) => {
          const p = buildings.getProducer(id);
          if (!p) return false;
          return Decimal.gte(p.count.value, count);
        },
        upgradeBought: (id) => upgrades.getPurchasable(id)?.bought.value ?? false,
        clickCountAtLeast: (count) => clickState.clickCount.value >= count,
        ownsEveryProducer: () =>
          data.producers
            .filter((p) => p.trigger === 'continuous')
            .every((p) => {
              const producer = buildings.getProducer(p.id);
              return producer ? Decimal.gte(producer.count.value, 1) : false;
            }),
        allTier1UpgradesBought: () =>
          data.producers
            .filter((p) => p.trigger === 'continuous')
            .every((p) => upgrades.getPurchasable(`${p.id}-boost-i`)?.bought.value ?? false),
        secondsSinceLastClick: () => clickState.elapsedSec.value - clickState.lastClickSec.value,
      };

      const achievementMultiplier = tunable<DecimalSource>(
        tuningRegistry,
        'balance/achievementMultiplier',
        () => data.balance.achievementMultiplier,
      );

      const achievements = createAchievementCategory<AchievementDef>({
        id: 'producer/achievements',
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
