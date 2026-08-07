import {
  createAutomationTiers,
  type AutomationTiers,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';

export const AutomationTiersKey: InjectionKey<AutomationTiers> = Symbol(
  'ambient/automation-tiers',
) as InjectionKey<AutomationTiers>;

/**
 * Tier ids in ladder order. `AutobuyerSpec.tier` is typed against this, so a
 * spec naming a tier that does not exist fails at the call site rather than
 * silently never unlocking.
 */
export type AmbientAutomationTier = 'manual' | 'basic';

/**
 * Ambient's automation ladder. `manual` is the no-automation baseline every
 * run starts on; `basic` gates the producer auto-buy in
 * `modules/autobuyers/auto-producers.ts`.
 *
 * **`basic` has no requirement, so it is unlocked imperatively at install and
 * the ladder is currently open.** That is deliberate, and it is the one place
 * this archetype diverges from what the tier system is for — recorded in
 * `BALANCING.md` § Known thin. The honest gate is a spine question, not a
 * structural one: the selection policy is a no-op while `planter` is the only
 * producer, so the natural rung is the second producer reveal (`coop-built`,
 * ~1.4m per `balance/reveal-probe.ts`). Setting it there moves the arc,
 * because `balance/bot.ts` enables every autobuyer spec at t=0 — which makes
 * it part of the open unfold-cadence decision rather than a free change.
 *
 * A fork wanting the gate replaces the `unlock` call below with
 * `requirement: () => getUnlocks().getPurchasable('coop-built')?.active.value`
 * and re-runs `balance/solve-probe.ts`.
 */
export function createAutomationModule(): EngineModule {
  return {
    id: 'ambient/automation',
    install(ctx) {
      const tiers = createAutomationTiers({
        id: 'ambient-automation',
        tiers: [
          { id: 'manual', name: 'Manual', order: 0 },
          { id: 'basic', name: 'Producer auto-buy', order: 1 },
        ],
      });

      // Ladder deliberately open — see the module doc above.
      tiers.unlock('basic');

      ctx.provide(AutomationTiersKey, tiers);
    },
  };
}
