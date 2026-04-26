import { CategoriesKey, type EngineCategories, type EngineModule } from 'open-loop-engine';
import { IncomeUpgradesKey } from './income-upgrades';
import { UnitsKey } from './units';

/**
 * Publish the archetype's purchasable categories under `CategoriesKey` for
 * external introspection (BalanceWorkbench, harness picker walkers,
 * content-walker leaves). Both sides' unit shops + income-upgrade shops
 * are introspectable; lane, income, and the per-side sequencers stay
 * outside the categories key — walkers that want them inject the
 * side-keyed keys directly.
 *
 * Aggregator only. No side parameter — single instance.
 */
export function createCategoriesModule(): EngineModule {
  return {
    id: 'tug/categories',
    dependencies: [
      'tug/match/player/units',
      'tug/match/ai/units',
      'tug/match/player/income-upgrades',
      'tug/match/ai/income-upgrades',
    ],
    install(ctx) {
      const playerUnits = ctx.inject(UnitsKey.player);
      const aiUnits = ctx.inject(UnitsKey.ai);
      const playerUpgrades = ctx.inject(IncomeUpgradesKey.player);
      const aiUpgrades = ctx.inject(IncomeUpgradesKey.ai);
      const categories: EngineCategories = {
        purchasables: [playerUnits, aiUnits, playerUpgrades, aiUpgrades],
      };
      ctx.provide(CategoriesKey, categories);
    },
  };
}
