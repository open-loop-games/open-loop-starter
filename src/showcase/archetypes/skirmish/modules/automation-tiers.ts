import {
  createAutomationTiers,
  type AutomationTiers,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';

export const AutomationTiersKey: InjectionKey<AutomationTiers> = Symbol(
  'skirmish/automation-tiers',
) as InjectionKey<AutomationTiers>;

/**
 * Automation tier ids in ladder order. `AutomationOptions.tier` is typed against this, so
 * a seat naming a tier that does not exist fails at the call site rather than
 * silently never spawning.
 */
export type SkirmishAutomationTier = 'manual' | 'assisted';

/**
 * Skirmish's automation ladder — what blocks the player seat's progression.
 *
 * Every run starts on `manual`. A seat constructed with `tier: 'assisted'`
 * spawns nothing until that tier unlocks; a seat constructed without a tier is
 * blocked by install-presence instead, which is what the two opponent seats use.
 *
 * `assisted` is unlocked imperatively rather than by a predicate because the
 * condition is a player-seat affordance that does not exist yet — AI-vs-AI
 * has no seat to unlock it *for*. What is real today is the ladder itself:
 * `modules/automation.test.ts` drives a tiered seat through lock and unlock, so
 * the path a player seat will take is exercised rather than assumed.
 */
export function createAutomationTiersModule(): EngineModule {
  return {
    id: 'skirmish/automation-tiers',
    install(ctx) {
      ctx.provide(
        AutomationTiersKey,
        createAutomationTiers({
          id: 'skirmish-automation',
          tiers: [
            { id: 'manual', displayName: 'Manual', order: 0 },
            { id: 'assisted', displayName: 'Assisted spawning', order: 1 },
          ],
        }),
      );
    },
  };
}
