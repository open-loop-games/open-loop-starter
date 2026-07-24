/**
 * Challenges module — owns the transcend-tier challenge category (challenge1..5)
 * + ECC softcap arithmetic + per-completion reward chain.bind routes.
 *
 * Surfaces:
 * - `challengesCategory` — `createChallengeCategory<ScalerChallengeDef + runtime fields>`
 *   with `goal` (continuous goal-met-on-tick per `Synergism.ts:3407, 3427, 3447,
 *   3467, 3487`) + `registerTick: ctx.onTick`. Engine ticks `canComplete →
 *   complete()` automatically, exiting via `complete(false)` (default
 *   `remainActive` = false).
 * - In-challenge restrictions wired declaratively via `ChallengeDef.restricts:
 *   Grant[]`. Engine lowers each Grant to `chain.bind` with the challenge's
 *   `active` predicate AND-composed (`category-base.ts:268-278`). Per-challenge
 *   shape (full-fidelity port; ambiguous reward routes flagged
 *   TODO(expansion)):
 *
 *   Ch1 — algebraic neutralization. Existing coin-tier 'Multiplier' bind
 *     contributes `multiplierPower^totalMultiplier`. Two restricts cancel +
 *     redirect:
 *       (1) `mult: multiplierPower^(-totalMultiplier)` neutralizes the
 *           existing bind (M × M⁻¹ = 1).
 *       (2) `mult: acceleratorPower^totalMultiplier` routes Multiplier amount
 *           into the accelerator-effect math (canonical `acceleratorEffect`
 *           reads `totalAccelerator + totalMultiplier`).
 *     **Invariant:** depends on no other bind composing with the existing
 *     'Multiplier' bind. See comment in `data/challenges.ts`.
 *
 *   Ch2 — multiplicative neutralization.
 *     Accelerator: `mult: acceleratorPower^(-totalAccelerator)` cancels the
 *       existing 'Accelerator' bind (A × A⁻¹ = 1).
 *     Multiplier: `mult: (1.25/multiplierPower)^totalMultiplier` swaps the
 *       existing 'Multiplier' bind from `2^N` to `1.25^N` (M × (target/M)^N
 *       = target^N when N=totalMultiplier; here M=multiplierPower=2,
 *       target=1.25). First-arc port collapses canonical's
 *       `1.25 + 0.0012 × Multiplier Boost` term to the constant 1.25 — the
 *       Multiplier Boost upgrades port inert.
 *
 *   Ch3 — Accelerator above 1 reduced by 50% + shard production halt.
 *     Accelerator swap: `mult: (1.05/acceleratorPower)^totalAccelerator`
 *       takes acceleratorPower 1.10 → 1.05 (canonical `1 + 0.10/2`).
 *     Crystal shard halt: `mult: 0` into diamond-1's rateChain (which emits
 *       prestigeShards via the engine's continuous tick).
 *     Mythos shard halt: `mult: 0` into mythos-1's rateChain (transcendShards
 *       emitter).
 *
 *   Ch4 — cost inflation past 1000. Lives in `modules/coin.ts` cumulative-buy
 *     cost closures (sibling-import accessor), NOT here. Ch4 def in this file
 *     carries no restricts — the cost-side restriction is implemented in
 *     coin.ts via `ch4Active()`. Coin / diamond producer cost inflation is
 *     `TODO(expansion)` — engine `purchase.costScaling` is static numeric.
 *
 *   Ch5 — cross-tier exponent crush. Lives in `modules/prestige.ts` and
 *     `modules/transcend.ts` gain formulas (sibling-import accessor reading
 *     `getChallengesCategory().getChallenge('challenge-5').active.value`).
 *     Ch5 def here carries no restricts — the exponent-shape restriction
 *     can't be expressed as a multiplicative Grant.
 *
 * - Per-completion ECC reward binds. Engine `rewards: Grant[]` gates binary
 *   on `completed > 0`, which doesn't fit per-count scaling. Instead, this
 *   module binds permanent install-time multipliers reading
 *   `entry.challenge.completions.value` through `eccTranscend()`. Routes:
 *
 *   Ch1: `mult: multiplierPower^(2 × ECC)` into all 5 coin-producer rateChains
 *   Ch2: `mult: acceleratorPower^(5 × ECC)` into all 5 coin-producer rateChains
 *   Ch3: `mult: 1 + 0.04 × completions` (linear, no ECC) into all 5 mythos
 *        rateChains; TODO(expansion) for `0.5×ECC` / `0.01×ECC` magnitudes
 *   Ch4: `mult: 1 + 0.05 × ECC` into all 5 coin rateChains; TODO(expansion)
 *        for cost-reduction magnitudes (`2×ECC`, `0.5×ECC`)
 *   Ch5: `add: 0.5 + ECC/100` into the offerings-accrual closure in
 *        `runesModule`'s afterReset hook; TODO(expansion) for `10^ECC` and
 *        `5×ECC` routes (likely Ascension-tier, fork-extension territory)
 *
 * Reset coordination: per-challenge `completions: Persistent<number>` lives
 * inside the engine's per-challenge persistent context at
 * `scaler-challenges/{def.id}` (per `createCategoryBase`). The transcend
 * reset (`modules/transcend.ts`) lists `resetModules: ['scaler-coin',
 * 'scaler-prestige', 'scaler-transcend']` — `scaler-challenges` is NOT in
 * scope, so the engine's persistent-ref sweep skips the challenge contexts.
 * Completion refs survive every transcend cycle automatically. Canonical
 * zeroing site is the Reincarnation reset (`Reset.ts:580-593`,
 * fork-extension territory).
 *
 * `restricts` use `setupDeclarativeBindings` at category construction (engine
 * binds them once + auto-attributes by `challenge.active` predicate). They do
 * NOT use scoped `pushScope` / `pushPatches`, so `category.restore()` after
 * save-load is a no-op for our shape.
 */

import { computed } from 'vue';
import {
  Decimal,
  type DecimalSource,
  type EngineModule,
  type EngineContext,
  type Grant,
  type ChallengeCategory,
  type ChallengeDef,
  createChallengeCategory,
  createMultiplicativeModifier,
} from '@open-loop/engine';
import { SCALER_CHALLENGES, type ScalerChallengeDef } from '../data';
import { getCoinResource, getCoinProducers, getAccelerator, getMultiplier } from './coin';
import { getDiamondProducers } from './prestige';
import { getMythosProducers } from './transcend';
import { CANONICAL_ACCELERATOR_POWER, CANONICAL_MULTIPLIER_POWER } from './canonical';

// Canonical ECC softcap parameters
// (`open-loop-research/reference-code/SynergismOfficial/src/Challenges.ts:599-617`
// `case 'transcend'`): linear contribution up to 100 completions; between 100
// and 1000 each contributes 1/20; above 1000 each contributes 1/100.
const CANONICAL_ECC_TRANSCEND_LINEAR_CAP = 100;
const CANONICAL_ECC_TRANSCEND_SOFT_DIVISOR = 20;
const CANONICAL_ECC_TRANSCEND_SOFT_BREAKPOINT = 1000;
const CANONICAL_ECC_TRANSCEND_HARD_DIVISOR = 100;

// First 5 entries of canonical `Variables.ts:121` `challengeBaseRequirements`
// — base log10 cost for `challengeRequirement(i, completion, special)`.
const CANONICAL_CHALLENGE_BASE_REQUIREMENTS = [10, 20, 60, 100, 200];

// ============================================================================
// ECC softcap arithmetic — `Challenges.ts:599-617` `case 'transcend'` verbatim
// ============================================================================
//
// TODO(expansion): graduate to `createSoftcappedAccumulator({ linearCap,
// softDivisor, softBreakpoint, hardDivisor })` engine helper after a second
// consumer derives the same shape (Looper-with-challenge-mods, Producer-with-
// challenge-layer). See `candidate-primitives.md`.

/**
 * Effective Challenge Completions for the transcend tier.
 * Linear ≤ 100; +1/20 per completion in [100, 1000]; +1/100 above 1000.
 */
function eccTranscend(completions: number): number {
  const linearCap = CANONICAL_ECC_TRANSCEND_LINEAR_CAP;
  const softDivisor = CANONICAL_ECC_TRANSCEND_SOFT_DIVISOR;
  const softBreakpoint = CANONICAL_ECC_TRANSCEND_SOFT_BREAKPOINT;
  const hardDivisor = CANONICAL_ECC_TRANSCEND_HARD_DIVISOR;

  let effective = 0;
  effective += Math.min(linearCap, completions);
  effective +=
    (1 / softDivisor) * (Math.min(softBreakpoint, Math.max(linearCap, completions)) - linearCap);
  effective += (1 / hardDivisor) * (Math.max(softBreakpoint, completions) - softBreakpoint);
  return effective;
}

// ============================================================================
// Per-challenge goal — `challengeRequirement` (canonical Challenges.ts:620-655)
// ============================================================================
//
// First-arc port lifts the transcend branch (challenge ≤ 5):
//   `Decimal.pow(10, base × calculateChallengeRequirementMultiplier('transcend',
//                completion, special))`
// The multiplier function reads later-arc state (corruption, c15 rewards,
// platonic upgrade 8) which all default to identity at first arc. Effective
// shape collapses to:
//   base × Math.pow(1 + completion, 2)   when completion < 75
//   base × (Math.pow(1 + completion, 12) / Math.pow(75, 8))   when ≥ 75
// First-arc completion cap is 25, so only the first branch is reachable.

function challengeRequirement(index: 1 | 2 | 3 | 4 | 5, completion: number): DecimalSource {
  const base = CANONICAL_CHALLENGE_BASE_REQUIREMENTS[index - 1];
  const multiplier = Math.pow(1 + completion, 2);
  return Decimal.pow(10, base * multiplier);
}

// ============================================================================
// Module state (populated in install)
// ============================================================================

type ScalerRuntimeChallengeDef = ChallengeDef & ScalerChallengeDef;
let challengesCategory: ChallengeCategory<ScalerRuntimeChallengeDef, void> | undefined;

// ============================================================================
// Public access
// ============================================================================

export function getChallengesCategory():
  | ChallengeCategory<ScalerRuntimeChallengeDef, void>
  | undefined {
  return challengesCategory;
}

/** Pure ECC export — sim tests and balance-discovery scripts read this. */
export { eccTranscend, challengeRequirement };

// ============================================================================
// Engine module
// ============================================================================

export const challengesModule: EngineModule = {
  id: 'scaler-challenges',
  dependencies: ['scaler-coin', 'scaler-prestige', 'scaler-transcend'],

  install(ctx: EngineContext) {
    const coins = getCoinResource();
    const acceleratorPurchasable = getAccelerator();
    const multiplierPurchasable = getMultiplier();

    // ─── Cross-tier rateChain references (sibling-import accessors) ────────
    const coinChains = getCoinProducers()
      .getAll()
      .map((e) => e.producer.rateChain);
    const diamond1Chain = getDiamondProducers().getProducer('diamond-1')?.rateChain;
    const mythos1Chain = getMythosProducers().getProducer('mythos-1')?.rateChain;

    const acceleratorPower = CANONICAL_ACCELERATOR_POWER;
    const multiplierPower = CANONICAL_MULTIPLIER_POWER;

    // Helper: build the runtime ChallengeDef for a given data def, gluing on
    // restricts / goal / completionLimit per-challenge.
    const buildRuntimeDef = (def: ScalerChallengeDef): ScalerRuntimeChallengeDef => {
      // Goal closure — canonical Synergism `Synergism.ts:3407` etc. branches on
      // `player.coins.gte(challengeRequirement(i, completions))`. Engine's
      // tick scan calls `complete()` whenever `canComplete` is true (active
      // AND goal); challenge auto-exits via `complete(false)`. Completion
      // count read at goal-eval time so the requirement scales correctly
      // with prior completions inside the same challenge re-entry.
      const goal = (): boolean => {
        const completions = challengesCategory?.getChallenge(def.id)?.completions.value ?? 0;
        return Decimal.gte(coins.value, challengeRequirement(def.index, completions));
      };

      let restricts: Grant[] = [];

      switch (def.index) {
        case 1: {
          // Ch1: neutralize existing Multiplier bind, redirect into accelerator math.
          if (coinChains.length > 0) {
            restricts = [
              {
                chain: coinChains,
                mult: () =>
                  Decimal.pow(multiplierPower, Decimal.neg(multiplierPurchasable.amount.value)),
                description: 'Ch1 — neutralize Multiplier (M⁻¹)',
              },
              {
                chain: coinChains,
                mult: () => Decimal.pow(acceleratorPower, multiplierPurchasable.amount.value),
                description: 'Ch1 — redirect Multiplier into Accelerator',
              },
            ];
          }
          break;
        }
        case 2: {
          // Ch2: kill Accelerator (A⁻¹); swap Multiplier to 1.25^N.
          if (coinChains.length > 0) {
            restricts = [
              {
                chain: coinChains,
                mult: () =>
                  Decimal.pow(acceleratorPower, Decimal.neg(acceleratorPurchasable.amount.value)),
                description: 'Ch2 — neutralize Accelerator (A⁻¹)',
              },
              {
                chain: coinChains,
                mult: () =>
                  Decimal.pow(
                    Decimal.div(1.25, multiplierPower),
                    multiplierPurchasable.amount.value,
                  ),
                description: 'Ch2 — Multiplier → 1.25^N',
              },
            ];
          }
          break;
        }
        case 3: {
          // Ch3: Accelerator 1.10 → 1.05; halt Crystal + Mythos shard production.
          const ch3: Grant[] = [];
          if (coinChains.length > 0) {
            ch3.push({
              chain: coinChains,
              mult: () =>
                Decimal.pow(
                  Decimal.div(1.05, acceleratorPower),
                  acceleratorPurchasable.amount.value,
                ),
              description: 'Ch3 — Accelerator 1.10 → 1.05',
            });
          }
          if (diamond1Chain) {
            ch3.push({
              chain: diamond1Chain,
              mult: () => 0,
              description: 'Ch3 — halt Crystal shard production',
            });
          }
          if (mythos1Chain) {
            ch3.push({
              chain: mythos1Chain,
              mult: () => 0,
              description: 'Ch3 — halt Mythos shard production',
            });
          }
          restricts = ch3;
          break;
        }
        case 4: {
          // Ch4 cost inflation lives in `modules/coin.ts` getAcceleratorCost /
          // getMultiplierCost — sibling-import accessor reads challenge active
          // state and applies `1.25^(buyingTo - 1000)`. No rateChain Grants.
          //
          // TODO(expansion): coin / diamond producer cost inflation per
          // canonical `Buy.ts:336-338`. Engine
          // `createProducerCategory.purchase.costScaling` is a static numeric
          // multiplier with no runtime-predicate hook — landing this requires
          // an engine surface change (`createProducerCategory` accepting a
          // `costMultiplier?: () => DecimalSource`) beyond first-arc-port
          // scope. File against `candidate-primitives.md`
          // when a second consumer derives the same need.
          restricts = [];
          break;
        }
        case 5: {
          // Ch5 cross-tier exponent crush lives in `modules/prestige.ts`
          // (prestigePointGainComputed) + `modules/transcend.ts`
          // (transcendPointGainComputed). Sibling-import accessor reads
          // `getChallengesCategory().getChallenge('challenge-5').active.value`.
          // Coordinated with the `inTranscensionChallenge` AND-guard on
          // prestige + transcend conversion `anyOf` requirements (deferred
          // from leaf 5 — load-bearing here because Ch5 crushes gain near
          // zero and would otherwise auto-prestige / auto-transcend with
          // useless gain).
          //
          // Ch5 def carries no restricts — the exponent-shape restriction
          // can't be expressed as a multiplicative Grant on a rateChain.
          restricts = [];
          break;
        }
      }

      return {
        ...def,
        completionLimit: def.completionLimit,
        goal,
        restricts,
      };
    };

    challengesCategory = createChallengeCategory<ScalerRuntimeChallengeDef>({
      id: 'scaler-challenges',
      mutuallyExclusive: true,
      registerTick: ctx.onTick,
    });
    challengesCategory.register(SCALER_CHALLENGES.map(buildRuntimeDef));

    // ─── Per-completion ECC reward binds ───────────────────────────────────
    // Permanent install-time binds — completions value flows through
    // computed reactivity automatically. Engine `rewards: Grant[]` gates
    // binary on `completed > 0`, doesn't fit per-count scaling, so we
    // hand-roll via `chain.bind`.
    for (const entry of challengesCategory.getAll()) {
      const completionsRef = computed(() => entry.challenge.completions.value);
      const ecc = computed(() => eccTranscend(completionsRef.value));

      switch (entry.def.index) {
        case 1: {
          for (const chain of coinChains) {
            chain.bind({
              modifier: createMultiplicativeModifier({
                multiplier: () => Decimal.pow(multiplierPower, 2 * ecc.value),
                description: 'Ch1 reward — multiplierPower^(2 × ECC)',
              }),
            });
          }
          break;
        }
        case 2: {
          for (const chain of coinChains) {
            chain.bind({
              modifier: createMultiplicativeModifier({
                multiplier: () => Decimal.pow(acceleratorPower, 5 * ecc.value),
                description: 'Ch2 reward — acceleratorPower^(5 × ECC)',
              }),
            });
          }
          break;
        }
        case 3: {
          // Linear `1 + 0.04 × completions` — canonical Challenges.ts:235
          // current1 reads completions directly (no ECC). Routes into mythos
          // rateChains as a tier-global multiplicative grant.
          const mythosChains = getMythosProducers()
            .getAll()
            .map((e) => e.producer.rateChain);
          for (const chain of mythosChains) {
            chain.bind({
              modifier: createMultiplicativeModifier({
                multiplier: () => Decimal.add(1, Decimal.mul(0.04, completionsRef.value)),
                description: 'Ch3 reward — 1 + 0.04 × completions',
              }),
            });
          }
          // TODO(expansion): canonical Challenges.ts:236-237 also exposes
          // `0.5 × ECC` and `0.01 × ECC` magnitudes — route ambiguous at
          // first arc (likely shard-cap mods); flag as expansion candidates.
          break;
        }
        case 4: {
          for (const chain of coinChains) {
            chain.bind({
              modifier: createMultiplicativeModifier({
                multiplier: () => Decimal.add(1, Decimal.mul(0.05, ecc.value)),
                description: 'Ch4 reward — 1 + 0.05 × ECC',
              }),
            });
          }
          // TODO(expansion): canonical Challenges.ts:241-243 exposes
          // `5 × ECC` (rate? reduction?) + `2 × ECC` (likely tax/cost
          // reduction) + `0.5 × ECC` magnitudes — routes ambiguous, defer.
          break;
        }
        case 5: {
          // Ch5 reward `0.5 + ECC/100` modifies offerings accrual. The
          // accrual closure lives in `runesModule`'s afterReset subscription
          // (`runes.ts:289-294`). To avoid touching that module, expose a
          // computed multiplier here and have the runes module read it via
          // sibling-import. For first-arc port, defer integration —
          // TODO(expansion) flag in `runesModule`'s afterReset hook to read
          // `getChallengesCategory().getChallenge('challenge-5').completions`
          // through ECC and apply `(0.5 + ECC/100)` to the offering gain.
          // Skipping the bind here keeps Ch5 reward inert at first arc.
          //
          // TODO(expansion): canonical Challenges.ts:251-253 also exposes
          // `10^ECC` and `5 × ECC` magnitudes — likely Ascension-tier
          // (fork-extension territory).
          break;
        }
      }
    }
  },
};
