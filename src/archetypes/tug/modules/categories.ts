import { CategoriesKey, type EngineCategories, type EngineModule } from 'open-loop-engine';
import { UnitsKey } from './units';

/**
 * Publish the archetype's purchasable categories under `CategoriesKey` for
 * external introspection (BalanceWorkbench, harness picker walkers,
 * content-walker leaves). Both sides' unit shops are introspectable; lane,
 * income, and the per-side sequencers stay outside the categories key —
 * walkers that want them inject the side-keyed keys directly.
 *
 * Aggregator only. No side parameter — single instance.
 */
export function createCategoriesModule(): EngineModule {
  return {
    id: 'tug/categories',
    dependencies: ['tug/match/player/units', 'tug/match/ai/units'],
    install(ctx) {
      const playerUnits = ctx.inject(UnitsKey.player);
      const aiUnits = ctx.inject(UnitsKey.ai);
      const categories: EngineCategories = {
        purchasables: [playerUnits, aiUnits],
      };
      ctx.provide(CategoriesKey, categories);
    },
  };
}
