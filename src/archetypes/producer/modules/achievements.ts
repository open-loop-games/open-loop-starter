import { computed } from 'vue';
import {
  Decimal,
  createAchievementCategory,
  type AchievementCategory,
  type Computable,
  type DecimalSource,
  type EngineModule,
  type Grant,
  type InjectionKey,
  type ModifierChain,
} from 'open-loop-engine';
import type { AchievementDef, ProducerData, ProducerGameState } from '../data/types';
import {
  BuildingsKey,
  ClickStateKey,
  PrimaryLifetimeKey,
  PrimaryResourceKey,
  HeadlineRateKey,
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

      // Every producer rateChain receives achievement grants — same shape as
      // global upgrades. Building this once keeps the Grant config trivial per def.
      const clickChain = buildings.getProducer('click')!.rateChain;
      const continuousChains: ModifierChain[] = [];
      for (const p of data.producers) {
        if (p.trigger !== 'continuous') continue;
        const producer = buildings.getProducer(p.id);
        if (producer) continuousChains.push(producer.rateChain);
      }
      const allChains: ModifierChain[] = [clickChain, ...continuousChains];

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

      const defaultReward: DecimalSource = data.balance.achievementMultiplier;

      // Per-achievement `requirement` closures so a tick-level poller can
      // synchronously complete earned achievements. The Vue watch that
      // `createAchievement` wires up runs on the async scheduler — sim
      // tests drive `stepOnce` in a tight loop where that scheduler
      // never flushes, so we tick-poll instead. Reference is kept per-id
      // because the declarative category wraps each achievement in its
      // own persistent context and complete() is idempotent.
      const requirements = new Map<string, (s: ProducerGameState) => boolean>();
      for (const def of data.achievements) {
        requirements.set(def.id, def.requirement);
      }

      const achievements = createAchievementCategory<AchievementDef>({
        id: 'producer/achievements',
        mapAchievement: (def) => {
          const grants: Grant[] = [
            {
              chain: allChains,
              mult: def.rewardMultiplier ?? defaultReward,
              description: def.name,
            },
          ];
          return {
            display: {
              title: def.name,
              description: def.description,
            },
            requirement: computed(() => def.requirement(state)) as unknown as Computable<boolean>,
            hidden: def.hidden ?? false,
            grants,
          };
        },
      });
      achievements.register(data.achievements);

      ctx.onTick(() => {
        for (const entry of achievements.getAll()) {
          if (entry.achievement.earned.value) continue;
          const req = requirements.get(entry.def.id);
          if (req && req(state)) {
            entry.achievement.complete();
          }
        }
      });

      ctx.provide(AchievementsKey, achievements);
    },
  };
}
