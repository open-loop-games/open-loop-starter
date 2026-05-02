import { unref } from 'vue';
import type { Ref } from 'vue';
import {
  Decimal,
  createAchievementCategory,
  createMultiplicativeModifier,
  getCombinedAchievementEffect,
  tunable,
  type Achievement,
  type AchievementCategory,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type PurchasableCategory,
  type Resource,
} from 'open-loop-engine';
import type {
  AchievementDef,
  AchievementSpec,
  ProducerData,
  ProducerDef,
  UpgradeDef,
} from '../data/types';
import {
  BuildingsKey,
  PrimaryLifetimeKey,
  PrimaryResourceKey,
  ProducerTuningRegistryKey,
  type ProducerInstanceState,
} from './producers';
import { UpgradesKey } from './upgrades';

export const AchievementsKey: InjectionKey<AchievementCategory<AchievementDef, unknown>> = Symbol(
  'producer/achievements',
) as InjectionKey<AchievementCategory<AchievementDef, unknown>>;

interface RequirementHandles {
  primary: Resource<DecimalSource>;
  primaryLifetime: Ref<DecimalSource>;
  buildings: import('open-loop-engine').ProducerCategory<ProducerDef, ProducerInstanceState>;
  upgrades: PurchasableCategory<UpgradeDef>;
  continuousIds: string[];
  tier1Ids: string[];
  arcUpgradeIds: string[];
}

function requirementForSpec(spec: AchievementSpec, h: RequirementHandles): () => boolean {
  switch (spec.kind) {
    case 'lifetime-at-least':
      return () => Decimal.gte(h.primaryLifetime.value, spec.threshold);
    case 'producer-count-at-least':
      return () => {
        const p = h.buildings.getProducer(spec.producer);
        return p ? Decimal.gte(p.count.value, spec.count) : false;
      };
    case 'click-count-at-least': {
      const state = h.buildings.getState('click');
      return () => (state?.count.value ?? 0) >= spec.count;
    }
    case 'upgrade-bought':
      return () => h.upgrades.getPurchasable(spec.upgradeId)?.active.value ?? false;
    case 'any-upgrade-bought':
      return () =>
        spec.upgradeIds.some((id) => h.upgrades.getPurchasable(id)?.active.value ?? false);
    case 'all-producers-owned':
      return () =>
        h.continuousIds.every((id) => {
          const p = h.buildings.getProducer(id);
          return p ? Decimal.gte(p.count.value, 1) : false;
        });
    case 'all-tier1-upgrades':
      return () => h.tier1Ids.every((id) => h.upgrades.getPurchasable(id)?.active.value ?? false);
    case 'arc-close':
      return () =>
        h.continuousIds.every((id) => {
          const p = h.buildings.getProducer(id);
          return p ? Decimal.gte(p.count.value, 1) : false;
        }) && h.arcUpgradeIds.every((id) => h.upgrades.getPurchasable(id)?.active.value ?? false);
  }
}

export function createAchievementsModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/achievements',
    dependencies: ['producer/producers', 'producer/upgrades'],
    install(ctx) {
      const buildings = ctx.inject(BuildingsKey);
      const upgrades = ctx.inject(UpgradesKey);
      const primary = ctx.inject(PrimaryResourceKey);
      const primaryLifetime = ctx.inject(PrimaryLifetimeKey);
      const tuningRegistry = ctx.inject(ProducerTuningRegistryKey);

      const achievementMultiplier = tunable<DecimalSource>(
        tuningRegistry,
        'balance/achievementMultiplier',
        () => data.balance.achievementMultiplier,
      );

      const continuousIds = data.producers
        .filter((p) => p.trigger === 'continuous')
        .map((p) => p.id);
      const tier1Ids = continuousIds.map((id) => `${id}-boost-i`);
      // Tier-iii per-producer upgrades are post-arc; everything else (per-producer
      // i/ii/iia + globals + clicks) is in-arc.
      const arcUpgradeIds = data.upgrades
        .filter((u) => !u.id.endsWith('-boost-iii'))
        .map((u) => u.id);

      const handles: RequirementHandles = {
        primary,
        primaryLifetime,
        buildings,
        upgrades,
        continuousIds,
        tier1Ids,
        arcUpgradeIds,
      };

      const achievements = createAchievementCategory<AchievementDef>({
        id: 'producer/achievements',
        mapAchievement: (def) => ({
          display: { title: def.name, description: def.description },
          requirement: requirementForSpec(def.spec, handles),
          hidden: def.hidden ?? false,
          effect: (): number => {
            const raw = def.reward ?? unref(achievementMultiplier);
            return new Decimal(raw).toNumber();
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

      ctx.provide(AchievementsKey, achievements);
    },
  };
}
