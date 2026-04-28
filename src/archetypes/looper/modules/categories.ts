import { CategoriesKey, type EngineCategories, type EngineModule } from 'open-loop-engine';
import { SkillsKey } from './skills';

/**
 * Publish the archetype's categories under `CategoriesKey` for external
 * introspection (BalanceWorkbench, harness/picker walkers). Skills is the
 * only `*Category`-shaped surface — actions are bespoke per-id state, queue
 * is a Sequencer (not a category), zones is a ZoneSystem (not a category).
 *
 * BalanceWorkbench iterates categories to populate its picker; without this
 * publish, the F12 dev panel comes up empty. DO NOT DROP per OL-696 audit.
 */
export function createCategoriesModule(): EngineModule {
  return {
    id: 'looper/categories',
    dependencies: ['looper/skills'],
    install(ctx) {
      const skills = ctx.inject(SkillsKey);
      const categories: EngineCategories = {
        skills: [skills],
      };
      ctx.provide(CategoriesKey, categories);
    },
  };
}
