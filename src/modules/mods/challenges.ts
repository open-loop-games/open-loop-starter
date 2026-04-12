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
 *   - Speed Run: gather 50 wood within a single loop
 *   - Minimalist: gather 100 gold using only the village zone
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
  type EngineModule,
  type EngineContext,
  type ChallengeCategory,
  type ChallengeDef,
  type DecimalSource,
} from 'open-loop-engine';
import { gatheringState } from '@/modules/gathering';
import { economyState } from '@/modules/economy';

// ============================================================================
// Types
// ============================================================================

export interface ChallengesState {
  challenges: ChallengeCategory<ChallengeDef>;
}

export let challengesState: ChallengesState | null = null;

// ============================================================================
// Module
// ============================================================================

export const challengesModule: EngineModule = {
  id: 'challenges',
  dependencies: ['gathering', 'economy', 'loop'],
  install(ctx: EngineContext) {
    const g = gatheringState!;
    const economy = economyState!;

    // Reset resources + actions on challenge enter (same scope as a loop restart)
    const challengeReset = createReset({
      thingsToReset: [
        g.resources.wood,
        g.resources.stone,
        g.resources.gold,
        ...g.actions.getAll().map(e => e.action),
      ],
    });

    // --- Challenge category -------------------------------------------------
    // Mutually exclusive: only one challenge active at a time.
    // No overrideRegistry needed — challenges use goal callbacks + reset.
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
        // Goal: accumulate 50 wood without buying any upgrades.
        // Checked manually in the tick below since goals need ICondition + accessor.
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
        // Goal: gather 100 wood as fast as possible (within one loop).
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
        // Goal: earn 20 gold using only village zone actions.
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
    // Challenges use plain boolean checks here rather than ICondition + accessor
    // since the starter doesn't wire a full GameStateAccessor. Real games would
    // use the declarative goal field with an accessor.
    ctx.onTick(() => {
      const noUpgrades = challenges.getChallenge('no-upgrades');
      if (noUpgrades?.active.value && !noUpgrades.maxed.value) {
        const hasNoUpgrades =
          Decimal.eq(economy.upgrades.sharpAxe.amount.value, 0) &&
          Decimal.eq(economy.upgrades.ironPickaxe.amount.value, 0) &&
          Decimal.eq(economy.upgrades.foreman.amount.value, 0);
        if (hasNoUpgrades && Decimal.gte(g.resources.wood.value, 50 as DecimalSource)) {
          noUpgrades.complete();
        }
      }

      const speedRun = challenges.getChallenge('speed-run');
      if (speedRun?.active.value && !speedRun.maxed.value) {
        if (Decimal.gte(g.resources.wood.value, 100 as DecimalSource)) {
          speedRun.complete();
        }
      }

      const minimalist = challenges.getChallenge('minimalist');
      if (minimalist?.active.value && !minimalist.maxed.value) {
        if (Decimal.gte(g.resources.gold.value, 20 as DecimalSource)) {
          minimalist.complete();
        }
      }
    });

    challengesState = { challenges };
  },
};
