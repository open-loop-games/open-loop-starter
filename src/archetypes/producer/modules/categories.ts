import { CategoriesKey, type EngineCategories, type EngineModule } from 'open-loop-engine';
import { BuildingsKey } from './producers';
import { UpgradesKey } from './upgrades';

/**
 * Publish the archetype's categories under `CategoriesKey` for external
 * introspection (content walkers, picker/perturbation harness, balance
 * workbench). Producer only exposes the producer + purchasable slices today;
 * achievements use closure-form predicates so the walker sees nothing
 * actionable there.
 */
export function createCategoriesModule(): EngineModule {
  return {
    id: 'producer/categories',
    dependencies: ['producer/producers', 'producer/upgrades'],
    install(ctx) {
      const buildings = ctx.inject(BuildingsKey);
      const upgrades = ctx.inject(UpgradesKey);
      ctx.provide(CategoriesKey, {
        producers: [buildings],
        purchasables: [upgrades],
      } as EngineCategories);
    },
  };
}
