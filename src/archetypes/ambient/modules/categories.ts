import { CategoriesKey, type EngineCategories, type EngineModule } from 'open-loop-engine';
import { AutoProducersKey } from './auto-producers';
import { UnlocksKey } from './unlocks';

/**
 * Publish the archetype's categories under `CategoriesKey` for external
 * introspection (BalanceWorkbench, harness/picker walkers, content-walker
 * leaves). Auto-producers (continuous resource generation) and unlocks
 * (purchasable visibility flags) are introspectable; achievements use
 * closure-form predicates so the walker sees nothing actionable there.
 *
 * Scene is a `ZoneSystem`, not a `*Category` — devtools that want to inspect
 * the variant set read `SceneKey` directly (or the engine could grow a
 * `ZoneSystemsKey` registry if a second consumer needs cross-system
 * iteration).
 */
export function createCategoriesModule(): EngineModule {
  return {
    id: 'ambient/categories',
    dependencies: ['ambient/auto-producers', 'ambient/unlocks'],
    install(ctx) {
      const buildings = ctx.inject(AutoProducersKey);
      const unlocks = ctx.inject(UnlocksKey);
      ctx.provide(CategoriesKey, {
        producers: [buildings],
        purchasables: [unlocks],
      } as EngineCategories);
    },
  };
}
