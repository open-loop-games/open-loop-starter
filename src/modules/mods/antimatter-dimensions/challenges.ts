/**
 * AD Infinity Challenges (IC1 Combined, IC2 Sacrifice, IC3 Tickspeed).
 *
 * All three challenges use `createChallengeCategory` with `reset: layer1Reset`
 * (entering an IC fires a full Layer 1 reset — the AD-canonical "Infinity into
 * the challenge" semantic). Completions + active state persist in the
 * `ad-challenges/{def.id}` context carved out by `createCategoryBase`, which
 * sits outside every Layer reset scope — so completion rewards stack across
 * Infinity and Eternity resets without extra wiring.
 *
 * Restrictions and rewards are expressed entirely as gated entries on existing
 * modifier chains, via a dedicated `createPersistentEffectSystem`. This is
 * deliberate: the BalanceWorkbench harness walks the effect-system registry
 * for rate attribution, so every challenge effect needs to appear as a named
 * chain entry to be introspectable. `OverrideRegistry` would bypass the chain
 * and is explicitly rejected here.
 *
 * The IC3 tickspeed rewire expresses "replace the existing 1.1^n multiplier
 * with (1.05 + 0.005·g)^n while active" as a cancel-then-replace pair of
 * modifiers. The awkwardness is intentional: filed as engine feedback under
 * OL-408 (a "replace entry X while condition Y holds" chain primitive would
 * collapse the pair).
 *
 * IC2's restriction (auto-fire Dimensional Sacrifice every 400ms while active)
 * is not a chain entry — it's a side-effect-ful tick handler whose *result*
 * (higher `sacrificeMult`) already flows through the existing chain entry
 * `midloop:sacrifice-mult`. The trigger is off-chain; the effect is on-chain.
 */
import {
  Decimal,
  createChallengeCategory,
  createMultiplicativeModifier,
  createPersistentEffectSystem,
  type Challenge,
  type ChallengeCategory,
  type EngineContext,
} from 'open-loop-engine';
import {
  CHALLENGE_GOAL_ANTIMATTER,
  CHALLENGE_REWARD_MULTIPLIER,
  challengeDefs,
  type ADChallengeDef,
} from './content';
import type { DimensionLayer } from './dimensions';
import type { Layer1State } from './layers';

const IC2_SACRIFICE_INTERVAL_SECONDS = 0.4;

export interface ChallengeLayer {
  challenges: ChallengeCategory<ADChallengeDef>;
  ic1: Challenge;
  ic2: Challenge;
  ic3: Challenge;
}

/**
 * Install the AD Infinity Challenge layer. Must be called after both Layer 0
 * (dimensions) and Layer 1 (Infinity reset + IP upgrades) are in place — the
 * challenge restrictions gate off of layer0 chains and the category uses
 * `layer1.layer1Reset` as its enter-reset.
 */
export function installChallenges(
  ctx: EngineContext,
  layer0: DimensionLayer,
  layer1: Layer1State,
): ChallengeLayer {
  const challenges = createChallengeCategory<ADChallengeDef>({
    id: 'ad-challenges',
    reset: layer1.layer1Reset,
    mutuallyExclusive: true,
  });
  challenges.register(challengeDefs);

  const ic1 = challenges.getChallenge('ic1-combined')!;
  const ic2 = challenges.getChallenge('ic2-sacrifice')!;
  const ic3 = challenges.getChallenge('ic3-tickspeed')!;

  const effects = createPersistentEffectSystem({ id: 'ad-challenge-effects' });

  // --- IC1 Combined --- suppresses Dim 4 and cancels the Dim Boost multiplier.
  effects.register({
    id: 'challenge:ic1:dim4-suppress',
    active: () => ic1.active.value,
    modifiers: [
      {
        chain: layer0.dims[3].rateChain,
        modifier: () =>
          createMultiplicativeModifier({
            multiplier: 0,
            description: 'IC1 Fourth Dimension suppressed',
          }),
      },
    ],
  });

  effects.register({
    id: 'challenge:ic1:boost-cancel',
    active: () => ic1.active.value && Decimal.gt(layer0.boostCount.value, 0),
    modifiers: [
      {
        chain: layer0.productionChain,
        modifier: () =>
          createMultiplicativeModifier({
            multiplier: () =>
              Decimal.recip(Decimal.add(1, Decimal.mul(layer0.boostCount.value, 0.5))),
            description: 'IC1 Dim Boost multiplier disabled',
          }),
      },
    ],
  });

  // --- IC3 Tickspeed Rewire --- cancel-then-replace the `1.1^n` modifier.
  // Two entries because the chain has no "replace-while-active" primitive
  // (filed as engine feedback on OL-408).
  effects.register({
    id: 'challenge:ic3:tickspeed-cancel',
    active: () => ic3.active.value && Decimal.gt(layer0.tickspeed.amount.value, 0),
    modifiers: [
      {
        chain: layer0.productionChain,
        modifier: () =>
          createMultiplicativeModifier({
            multiplier: () => Decimal.recip(Decimal.pow(1.1, layer0.tickspeed.amount.value)),
            description: 'IC3 Tickspeed cancel',
          }),
      },
    ],
  });

  effects.register({
    id: 'challenge:ic3:tickspeed-rewire',
    active: () => ic3.active.value && Decimal.gt(layer0.tickspeed.amount.value, 0),
    modifiers: [
      {
        chain: layer0.productionChain,
        modifier: () =>
          createMultiplicativeModifier({
            multiplier: () =>
              Decimal.pow(
                Decimal.add(1.05, Decimal.mul(layer0.galaxyCount.value, 0.005)),
                layer0.tickspeed.amount.value,
              ),
            description: 'IC3 Tickspeed rewire (1.05 + 0.005·g)^n',
          }),
      },
    ],
  });

  // --- Rewards --- uniform ×1.3 per completion to productionChain.
  // With completionLimit=1, `completions.value` caps at 1 and the multiplier
  // resolves to a flat 1.3. The predicate (`completions > 0`) flips true once
  // on first complete and stays true (completion context is never reset).
  const registerReward = (id: string, challenge: Challenge): void => {
    effects.register({
      id: `challenge:${id}:reward`,
      active: () => challenge.completions.value > 0,
      modifiers: [
        {
          chain: layer0.productionChain,
          modifier: () =>
            createMultiplicativeModifier({
              multiplier: () =>
                Decimal.pow(CHALLENGE_REWARD_MULTIPLIER, challenge.completions.value),
              description: `${id} reward (×${CHALLENGE_REWARD_MULTIPLIER}^completions)`,
            }),
        },
      ],
    });
  };
  registerReward('ic1', ic1);
  registerReward('ic2', ic2);
  registerReward('ic3', ic3);

  // --- Goal + IC2 auto-sacrifice tick ---
  // Hand-rolled goal loop matches the pattern from src/modules/mods/challenges.ts
  // (TODO(ergonomics) + OL-366): `ChallengeDef.goal: ICondition` requires an
  // accessor map AD doesn't have.
  let ic2SacrificeAccumulator = 0;
  ctx.onTick((dt) => {
    if (ic1.active.value && !ic1.maxed.value && Decimal.gte(layer0.antimatter.value, CHALLENGE_GOAL_ANTIMATTER)) {
      ic1.complete();
    }
    if (ic2.active.value && !ic2.maxed.value && Decimal.gte(layer0.antimatter.value, CHALLENGE_GOAL_ANTIMATTER)) {
      ic2.complete();
    }
    if (ic3.active.value && !ic3.maxed.value && Decimal.gte(layer0.antimatter.value, CHALLENGE_GOAL_ANTIMATTER)) {
      ic3.complete();
    }

    if (ic2.active.value) {
      ic2SacrificeAccumulator += dt;
      while (ic2SacrificeAccumulator >= IC2_SACRIFICE_INTERVAL_SECONDS) {
        ic2SacrificeAccumulator -= IC2_SACRIFICE_INTERVAL_SECONDS;
        if (layer0.canSacrifice.value) layer0.doSacrifice();
      }
    } else {
      ic2SacrificeAccumulator = 0;
    }
  });

  return { challenges, ic1, ic2, ic3 };
}
