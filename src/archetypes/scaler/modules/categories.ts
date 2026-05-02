import {
  CategoriesKey,
  type EngineCategories,
  type EngineContext,
  type EngineModule,
} from 'open-loop-engine';
import { AntimatterProducersKey } from './antimatter';
import { CrystalUpgradesKey, PrestigeProducersKey } from './prestige';
import { ChallengesKey, TranscendProducersKey, TranscendUpgradesKey } from './transcend';
import { AchievementsKey } from './achievements';

// Publish the archetype's categories under CategoriesKey for external
// introspection (content walkers, picker/perturbation harness, balance
// workbench). Acc Boost and Accelerator/Multiplier are constructed via
// raw createPurchasable (not category-wrapped), so they don't appear here
// — tooling that needs them can inject the per-purchasable keys directly.
export function createCategoriesModule(): EngineModule {
  return {
    id: 'scaler/categories',
    dependencies: [
      'scaler/antimatter',
      'scaler/prestige',
      'scaler/transcend',
      'scaler/achievements',
    ],
    install(ctx: EngineContext): void {
      const antimatterProducers = ctx.inject(AntimatterProducersKey);
      const prestigeProducers = ctx.inject(PrestigeProducersKey);
      const crystalUpgrades = ctx.inject(CrystalUpgradesKey);
      const transcendProducers = ctx.inject(TranscendProducersKey);
      const transcendUpgrades = ctx.inject(TranscendUpgradesKey);
      const challenges = ctx.inject(ChallengesKey);
      const achievements = ctx.inject(AchievementsKey);

      ctx.provide(CategoriesKey, {
        producers: [antimatterProducers, prestigeProducers, transcendProducers],
        purchasables: [crystalUpgrades, transcendUpgrades],
        challenges: [challenges],
        achievements: [achievements],
      } as EngineCategories);
    },
  };
}
