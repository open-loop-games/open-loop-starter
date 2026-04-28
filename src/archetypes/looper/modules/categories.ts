import { CategoriesKey, type EngineCategories, type EngineModule } from 'open-loop-engine';
import { CapabilitiesKey } from './capabilities';

/**
 * Publish the archetype's categories under `CategoriesKey` for external
 * introspection (BalanceWorkbench, harness/picker walkers). Capabilities is
 * the only `*Category`-shaped surface — actions are bespoke per-id state,
 * queue is a Sequencer (not a category), zones is a ZoneSystem (not a
 * category).
 *
 * Capabilities surface under the `skills:` slot — `EngineCategories` types
 * its slot keys against engine-defined category kinds; the looper's
 * single-axis capability category shape is structurally a SkillCategory and
 * BalanceWorkbench iterates it via that slot.
 *
 * BalanceWorkbench iterates categories to populate its picker; without this
 * publish, the F12 dev panel comes up empty.
 */
export function createCategoriesModule(): EngineModule {
  return {
    id: 'looper/categories',
    dependencies: ['looper/capabilities'],
    install(ctx) {
      const capabilities = ctx.inject(CapabilitiesKey);
      const categories: EngineCategories = {
        skills: [capabilities],
      };
      ctx.provide(CategoriesKey, categories);
    },
  };
}
