import { unref } from 'vue';
import {
  Decimal,
  createAchievementCategory,
  createMultiplicativeModifier,
  getCombinedAchievementEffect,
  toNumber,
  tunable,
  type Achievement,
  type AchievementCategory,
  type DecimalSource,
  type EngineModule,
} from '@open-loop/engine';
import type { AchievementDef, ProducerData, ProducerGameState } from '../data/types';
import {
  ProducerTuningRegistryKey,
  getBuildings,
  getClickCount,
  getPrimaryResource,
} from './producers';

let achievements: AchievementCategory<AchievementDef, unknown>;

export function getAchievements(): AchievementCategory<AchievementDef, unknown> {
  return achievements;
}

/**
 * Achievement module — cross-cutting bank / cps / click series authored as
 * a flat `AchievementDef[]` per spec § 4. Per-building owned-count tiers
 * land separately in `modules/milestones.ts` via `createTieredAchievement`
 * against `producer.count`.
 *
 * Spec § 4 authors `AchievementDef.requirement` as
 * `(state: ProducerGameState) => boolean`. The engine's
 * `AchievementOptions.requirement` is zero-arg `Computable<boolean> | Gate`.
 * Bridge here: build a `ProducerGameState` on demand from live module
 * accessors and wrap each def's predicate as `() => def.requirement(state())`.
 * Predicate evaluation is driven by Vue's `watch` inside `createAchievement`,
 * so the reactive reads inside `readState` register dependencies normally.
 */
export function createAchievementsModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/achievements',
    dependencies: ['producer/producers', 'producer/upgrades'],
    install(ctx) {
      const buildings = getBuildings();
      const primary = getPrimaryResource();
      const clickCount = getClickCount();
      const tuningRegistry = ctx.inject(ProducerTuningRegistryKey);

      // Default multiplicative reward for the bank/cps/click achievement
      // series and per-building milestone tiers. Declared invention: the
      // ×1.02 per-achievement direct multiplier stands in for the canonical
      // milk/kitten chain (`main.js:5240`, `:5256–5271`) per spec § 5 — the
      // full chain ports if kitten upgrades enter first-arc scope.
      const defaultReward = tunable<DecimalSource>(
        tuningRegistry,
        'balance/achievementRewardMultiplier',
        () => 1.02,
      );

      const readState = (): ProducerGameState => {
        const producerCounts: Record<string, Decimal> = {};
        for (const entry of buildings.getAll()) {
          producerCounts[entry.def.id] = new Decimal(entry.producer.count.value);
        }
        return {
          cookies: new Decimal(primary.value),
          cookiesEarned: new Decimal(primary.cumulative?.value ?? primary.value),
          cps: new Decimal(buildings.getTotalRate(primary)),
          clicks: new Decimal(clickCount.cumulative?.value ?? clickCount.value),
          producerCounts,
        };
      };

      achievements = createAchievementCategory<AchievementDef>({
        id: 'producer/achievements',
        mapAchievement: (def) => ({
          display: { title: def.name, description: def.description },
          requirement: () => def.requirement(readState()),
          hidden: def.hidden ?? false,
          effect: () => toNumber(def.rewardMultiplier ?? unref(defaultReward)),
        }),
      });
      achievements.register(data.achievements);

      // G-M10 — one multiplicative modifier per producer rate chain backed
      // by the cumulative earned-achievement product. Implements the spec
      // § 5 declared-invention shape: per-achievement direct multiplier in
      // place of the canonical milk/kitten chain.
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
