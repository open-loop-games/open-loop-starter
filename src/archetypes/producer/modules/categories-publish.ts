import { CategoriesKey, type EngineCategories, type EngineModule } from 'open-loop-engine';
import { BuildingsKey, PrimaryResourceKey } from './producers';
import { UpgradesKey } from './upgrades';
import { AchievementsKey } from './achievements';

/**
 * Single bootstrap point for `CategoriesKey`. Publishes producers, upgrades,
 * achievements, and the primary resource so external introspection tools
 * (workbench, walkers, sim) can dispatch to per-category adapters without
 * wiring per-archetype keys. Achievements are deliberately included — earlier
 * shapes split publication across modules and forgot achievements, blinding
 * walkers to G-M10's headline-multiplier source.
 */
export function createCategoriesPublishModule(): EngineModule {
  return {
    id: 'producer/categories-publish',
    dependencies: ['producer/producers', 'producer/upgrades', 'producer/achievements'],
    install(ctx) {
      const buildings = ctx.inject(BuildingsKey);
      const upgrades = ctx.inject(UpgradesKey);
      const achievements = ctx.inject(AchievementsKey);
      const primary = ctx.inject(PrimaryResourceKey);
      ctx.provide(CategoriesKey, {
        producers: [buildings],
        purchasables: [upgrades],
        achievements: [achievements],
        resources: [primary],
      } as EngineCategories);
    },
  };
}
