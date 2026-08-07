import {
  createAutomationTiers,
  persistent,
  type AutomationTiers,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import { computed } from 'vue';
import { GAME_BALANCE, type GameBalance } from '../data/game';

/**
 * Automation module — the blank base's example of the one canonical shape for
 * player-facing automation: a policy that is invisible until its tier unlocks.
 * See `.claude/rules/archetype-authoring.md` § Conformance.
 *
 * DELETE-OR-RESHAPE, like the rest of the blank economy. What a fork should
 * keep is the *shape*: a tier ladder, a policy gated on `hasReached`, and a
 * player toggle underneath it. What a fork replaces is what the policy does —
 * here, a flat multiplier on the core accrual.
 *
 * The ladder ships locked, so a clean fork's arc is exactly the linear spine in
 * `../data/game.ts` § Balance. Unlocking makes it piecewise, which is the
 * lesson worth inheriting: gated automation is a *balance* change, not just a
 * structural one, and the projection has to say so.
 */

/** Tier ids in ladder order. Policies are typed against this union. */
export type GameAutomationTier = 'manual' | 'assisted';

export interface AutomationApi {
  /** The ladder itself — `hasReached`, `unlock`, `currentTierId`. */
  tiers: AutomationTiers;
  /** Player toggle. Meaningless until the tier unlocks; that is the point. */
  isActive: Persistent<boolean>;
  /**
   * Live accrual multiplier: `1` while locked or toggled off, the configured
   * boost otherwise. `modules/core.ts` reads this into its tick.
   */
  boostMultiplier: ComputedRef<number>;
}

export const AutomationKey: InjectionKey<AutomationApi> = Symbol(
  'game/automation',
) as InjectionKey<AutomationApi>;

export interface AutomationModuleOptions {
  balance?: GameBalance;
}

export function createAutomationModule(options: AutomationModuleOptions = {}): EngineModule {
  const data = options.balance ?? GAME_BALANCE;

  return {
    id: 'game/automation',
    install(ctx) {
      const tiers = createAutomationTiers({
        id: 'game-automation',
        tiers: [
          { id: 'manual', name: 'Manual', order: 0 },
          { id: 'assisted', name: 'Assisted', order: 1 },
        ],
      });

      const isActive = persistent<boolean>(false, { name: 'automationActive' });

      ctx.provide(AutomationKey, {
        tiers,
        isActive,
        boostMultiplier: computed(() =>
          tiers.hasReached('assisted') && isActive.value ? data.autoBoostMultiplier : 1,
        ),
      });
    },
  };
}
