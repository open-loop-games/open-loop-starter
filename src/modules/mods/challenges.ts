/**
 * Challenges mod — variant layer demonstrating challenge-category + reset.
 *
 * Engine systems demonstrated:
 *   - createChallengeCategory (mutually exclusive challenges with lifecycle)
 *   - createReset (bulk-reset persistent refs on challenge enter)
 *
 * Challenges restrict the game while active and reward the player on
 * completion. This mod defines 3 challenges:
 *   - No Upgrades: complete a loop without buying any upgrades
 *   - Speed Run: gather 100 wood within a single loop
 *   - Minimalist: gather 20 gold using only the village zone
 *
 * Each challenge resets resources on enter and grants a permanent
 * production multiplier on completion.
 *
 * Cross-references:
 *   - gathering.ts provides resources + zones checked by challenge goals
 *   - economy.ts provides productionChain for reward modifiers
 *   - loop.ts provides the loop cycle that challenges operate within
 */
import {
  Decimal,
  createChallengeCategory,
  createReset,
  createMultiplicativeModifier,
  hasResource,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type ChallengeCategory,
  type ChallengeDef,
} from 'open-loop-engine';
import { GatheringKey } from '@/modules/village-gatherer/gathering';
import { EconomyKey } from '@/modules/village-gatherer/economy';

// ============================================================================
// Types
// ============================================================================

export interface ChallengesState {
  challenges: ChallengeCategory<ChallengeDef>;
}

export const ChallengesKey: InjectionKey<ChallengesState> = Symbol('challenges') as InjectionKey<ChallengesState>;

// ============================================================================
// Module
// ============================================================================

export const challengesModule: EngineModule = {
  id: 'challenges',
  dependencies: ['gathering', 'economy', 'loop'],
  install(ctx: EngineContext) {
    const g = ctx.inject(GatheringKey);
    const economy = ctx.inject(EconomyKey);

    // Reset gathering on challenge enter — same scope as a loop restart
    const challengeReset = createReset({
      resetModules: ['gathering'],
    });

    // --- Challenge category -------------------------------------------------
    // Mutually exclusive: only one challenge active at a time.
    const challenges = createChallengeCategory<ChallengeDef>({
      id: 'challenges',
      reset: challengeReset,
      mutuallyExclusive: true,
      registerTick: ctx.onTick,
    });

    challenges.register([
      {
        id: 'no-upgrades',
        name: 'No Upgrades',
        completionLimit: 1,
        onComplete() {
          // Reward: +25% production permanently
          economy.productionChain.add(createMultiplicativeModifier({
            multiplier: 1.25,
            description: 'No Upgrades (challenge reward)',
          }));
        },
      },
      {
        id: 'speed-run',
        name: 'Speed Run',
        completionLimit: 3,
        onComplete() {
          // Reward: +10% production per completion (stacks)
          economy.productionChain.add(createMultiplicativeModifier({
            multiplier: 1.1,
            description: 'Speed Run (challenge reward)',
          }));
        },
      },
      {
        id: 'minimalist',
        name: 'Minimalist',
        completionLimit: 1,
        onComplete() {
          // Reward: +50% production permanently
          economy.productionChain.add(createMultiplicativeModifier({
            multiplier: 1.5,
            description: 'Minimalist (challenge reward)',
          }));
        },
      },
    ]);

    // --- Goal checking (manual tick) ----------------------------------------
    // ChallengeDef supports `goal: ICondition` for declarative auto-completion,
    // but ICondition requires a GameStateAccessor mapping string IDs to live
    // refs — more setup than these 3 hand-written checks justify.
    // TODO(ergonomics) A callback-based goal (goal: () => boolean) on
    // ChallengeDef would avoid both the accessor ceremony and this tick polling.
    // See OL-366 for engine-side improvements.
    function checkGoal(id: string, condition: () => boolean) {
      const ch = challenges.getChallenge(id);
      if (ch?.active.value && !ch.maxed.value && condition()) {
        ch.complete();
      }
    }

    ctx.onTick(() => {
      checkGoal('no-upgrades', () =>
        Decimal.eq(economy.upgrades.sharpAxe.amount.value, 0) &&
        Decimal.eq(economy.upgrades.ironPickaxe.amount.value, 0) &&
        Decimal.eq(economy.upgrades.foreman.amount.value, 0) &&
        hasResource(g.resources.wood, 50));

      checkGoal('speed-run', () => hasResource(g.resources.wood, 100));

      checkGoal('minimalist', () => hasResource(g.resources.gold, 20));
    });

    const state: ChallengesState = { challenges };
    ctx.provide(ChallengesKey, state);
  },
};
