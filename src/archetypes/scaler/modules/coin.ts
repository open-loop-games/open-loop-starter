/**
 * Coin tier module — owns the entire coin substrate of the Scaler archetype.
 *
 * Surfaces:
 * - `coins` resource (createResource).
 * - `coinProducers` (createProducerCategory) — 5 producers with the canonical
 *   geometric base-cost ladder. Intra-tier cascade per `Synergism.ts:4378-4407`
 *   wires through `mapping.extraCount`, gated inert against `player.upgrades[101..105]`
 *   reading 0 until the cascade upgrades land in a later leaf.
 * - Accelerator + Multiplier — cumulative-buy upgrades whose canonical cost is
 *   piecewise-with-factorial-bump (`Buy.ts:33-77` + `:163-197`), beyond
 *   closed-form geometric. Use `createScalingPurchasable.costFormula` opaque
 *   value-function path (OL-894): the factory hides the mirror+watch wiring
 *   that this module previously hand-rolled. Crystal upgrades in the prestige
 *   module use the same surface.
 * - `coinUpgrades` (createPurchasableCategory) — Upgrades-tab grid positions
 *   1-20. Each entry's `grants[]` resolves the data-side `UpgradeGrant.scope`
 *   into one or more producer rateChain bindings; `tier-global` scope binds
 *   into all 5 coin producers' chains via the array form of `Grant.chain`.
 *
 * Cross-tier binding pattern (locked at this leaf, propagates forward):
 * sibling tier modules import `coinProducers` directly (ES import — no
 * injection key). Cross-tier upgrades grant via `coinProducers.getProducer(id)
 * .rateChain`. Engine `ChainRegistryKey` exists for balance-workbench
 * introspection only; binding lookups stay typed via direct import. The
 * coin-layer reset is declared by the owning prestige module's
 * `createReset({ resetModules: ['scaler-coin', 'scaler-prestige'], keep: [...] })`
 * — the engine's `getModulePersistentRefs` walks the parent→child context
 * tree (verified `persistence.ts:660-676`), so the prestige reset's union
 * scope sweeps every coin-tier sub-context automatically.
 */

import {
  Decimal,
  type DecimalSource,
  type EngineModule,
  type EngineContext,
  type Resource,
  type Purchasable,
  type ProducerCategory,
  type PurchasableCategory,
  type ModifierChain,
  bn,
  createResource,
  createProducerCategory,
  createScalingPurchasable,
  createPurchasableCategory,
  createCostRequirement,
  createMultiplicativeModifier,
  createModifierChain,
} from '@open-loop/engine';
import {
  COIN_PRODUCERS,
  ACCELERATOR_DEF,
  MULTIPLIER_DEF,
  COIN_UPGRADES,
  SCALER_BALANCE,
  type ProducerDef,
  type UpgradeDef,
} from '../data';
import { buildScalerGameState, expandUpgradeGrant } from '../composables/scaler-game-state';
import { getChallengesCategory } from './challenges';

/**
 * Lazy sibling-import accessor for Ch4's cost-inflation gate. Resolved at
 * cost-closure call time (post-install), so the module-evaluation cycle
 * (coin → composables → challenges → coin) doesn't load-fail. Returns false
 * pre-install or when the challenges category hasn't yet registered Ch4 —
 * the cost closure then runs the canonical (non-inflated) shape.
 */
function ch4Active(): boolean {
  try {
    return getChallengesCategory()?.getChallenge('challenge-4')?.active.value ?? false;
  } catch {
    return false;
  }
}

// ============================================================================
// Module state (populated in install)
// ============================================================================

let coins: Resource<DecimalSource>;
let coinProducerCategory: ProducerCategory<ProducerDef, void>;
let acceleratorPurchasable: Purchasable;
let multiplierPurchasable: Purchasable;
let coinUpgradesCategory: PurchasableCategory<UpgradeDef, void>;
let freeAcceleratorChain: ModifierChain;
let freeMultiplierChain: ModifierChain;
let acceleratorPowerBonusChain: ModifierChain;

const ZERO: DecimalSource = 0;

// ============================================================================
// Public access
// ============================================================================

/** Direct handle to the coin resource. Used by sibling modules and UI. */
export function getCoinResource(): Resource<DecimalSource> {
  return coins;
}

/**
 * The coin producer category. Sibling tier modules import this directly to
 * grant into per-producer rateChains — see § cross-tier binding in the
 * module head comment.
 */
export function getCoinProducers(): ProducerCategory<ProducerDef, void> {
  return coinProducerCategory;
}

/** Accelerator purchasable handle. */
export function getAccelerator(): Purchasable {
  return acceleratorPurchasable;
}

/** Multiplier purchasable handle. */
export function getMultiplier(): Purchasable {
  return multiplierPurchasable;
}

/** Coin upgrades category (Upgrades-tab band 1-20). */
export function getCoinUpgrades(): PurchasableCategory<UpgradeDef, void> {
  return coinUpgradesCategory;
}

/**
 * Additive aggregator for free-Accelerator contributions. Achievement counter
 * grants and (eventually) Upgrades 7/8/9/11 bind `add` modifiers; the
 * Accelerator rate-effect closure reads `chain.apply(0)` into `bought + free`.
 */
export function getCoinFreeAcceleratorChain(): ModifierChain {
  return freeAcceleratorChain;
}

/** Free-Multiplier additive aggregator. Mirrors `freeAccelerator`. */
export function getCoinFreeMultiplierChain(): ModifierChain {
  return freeMultiplierChain;
}

/**
 * Additive bump to the canonical `acceleratorPower` coefficient. Achievement
 * counter grants bind `add` modifiers; the Accelerator rate-effect closure
 * reads `SCALER_BALANCE.acceleratorPower + chain.apply(0)` as the exponent
 * base.
 */
export function getCoinAcceleratorPowerBonusChain(): ModifierChain {
  return acceleratorPowerBonusChain;
}

// ============================================================================
// Cumulative-buy cost closures (canonical port)
// ============================================================================

/**
 * Accelerator cost per `Buy.ts:33-77`. First-arc port covers the canonical
 * core: geometric `(4/costDivisor)^buyingTo` over `baseCost` 500, plus the
 * `buyingTo > 125` factorial bump. Threshold conditionals past 1e15 / for
 * specific challenges port inert until those systems land.
 *
 * `buyingTo` is the next purchase index (1-indexed); canonical decrements
 * inside `getCostInternal`, so `buyingTo - 1` matches `--buyingTo`.
 */
function getAcceleratorCost(amount: DecimalSource): DecimalSource {
  const buyingTo = bn(amount).toNumber();
  const cd = bn(SCALER_BALANCE.costDivisor).toNumber();
  let cost: Decimal = Decimal.pow(4 / cd, buyingTo).mul(500);

  if (buyingTo > 125) {
    const num = buyingTo - 125;
    const factorialBit = factorialNum(num);
    const multBit = Decimal.pow(4, num);
    cost = cost.mul(multBit).mul(factorialBit);
  }

  // Ch4 cost inflation — `Buy.ts:73-77` super-exponential factor past 1000.
  // Applies only to Accelerator + Multiplier (cumulative-buy mirror); coin
  // producer costs are static-numeric `purchase.costScaling` and don't
  // accept a runtime predicate at first arc — TODO(expansion).
  const ch4Threshold = SCALER_BALANCE.ch4CostInflationThreshold;
  if (ch4Active() && buyingTo > ch4Threshold) {
    cost = cost.mul(Decimal.pow(SCALER_BALANCE.ch4CostInflationBase, buyingTo - ch4Threshold));
  }

  return cost;
}

/**
 * Multiplier cost per `Buy.ts:163-197`. Canonical core: geometric
 * `10^buyingTo` over `baseCost` 1e4, plus the `buyingTo > 75` factorial bump.
 */
function getMultiplierCost(amount: DecimalSource): DecimalSource {
  const buyingTo = bn(amount).toNumber();
  let cost: Decimal = Decimal.pow(10, buyingTo).mul(1e4);

  if (buyingTo > 75) {
    const num = buyingTo - 75;
    const factorialBit = factorialNum(num);
    const multBit = Decimal.pow(10, num);
    cost = cost.mul(multBit).mul(factorialBit);
  }

  // Ch4 cost inflation — `Buy.ts:209-211` super-exponential factor past 1000.
  // See parallel branch in `getAcceleratorCost` for the matching scope note.
  const ch4Threshold = SCALER_BALANCE.ch4CostInflationThreshold;
  if (ch4Active() && buyingTo > ch4Threshold) {
    cost = cost.mul(Decimal.pow(SCALER_BALANCE.ch4CostInflationBase, buyingTo - ch4Threshold));
  }

  return cost;
}

/**
 * `Decimal.factorial` isn't exposed on the engine surface, but n! for the
 * `n < 170` range we hit at first-arc levels stays inside Number precision.
 * Canonical uses `Decimal.factorial` from `break_infinity.js`; we hand-roll
 * the equivalent for portable arithmetic.
 */
function factorialNum(n: number): Decimal {
  if (n <= 1) return new Decimal(1);
  if (n > 170) {
    // Stirling's approximation in log-space for very large n — leaf-1 territory
    // never reaches here, but the path is documented for fidelity past 1e15
    // territory in later leaves.
    const logFact = (n + 0.5) * Math.log10(n) - n / Math.LN10 + 0.5 * Math.log10(2 * Math.PI);
    return Decimal.pow(10, logFact);
  }
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return new Decimal(f);
}

// ============================================================================
// Engine module
// ============================================================================

export const coinModule: EngineModule = {
  id: 'scaler-coin',

  install(ctx: EngineContext) {
    // Canonical `Synergism.ts:250` initial = 100; `Reset.ts:408` resets to 102.
    // First-arc port lifts the initial — exactly enough to bootstrap the
    // first Worker (cost 100). Engine reset (post-leaf-2 prestige) writes
    // `ref.value = ref[DefaultValue]`, so the same starting kit comes back
    // every cycle.
    coins = createResource(100, { displayName: 'coins', precision: 0 });

    // ─── Producers ─────────────────────────────────────────────────────────
    coinProducerCategory = createProducerCategory<ProducerDef>({
      id: 'coin-producers',
      registerTick: ctx.onTick,
      mapProducer: (def) => ({
        resource: coins,
        baseRate: def.baseRate,
        trigger: 'continuous',
        display: def.name,
        purchase: {
          costResource: coins,
          baseCost: def.baseCost,
          costScaling: def.costScaling,
        },
        // Cascade-feed: producer N+1's owned + generated tally feeds producer N's
        // tick through `extraCount`. Gated on `upgrades[101..105]` per
        // `Synergism.ts:4378-4407`; until those upgrades land in a later leaf
        // the gate evaluates false and the cascade stays off (`extraCount`
        // resolves to 0).
        //
        // TODO(expansion): swap the gate read for the live upgrade-101..105
        // amount when the cascade-gate upgrade band lands.
        extraCount: () => ZERO,
      }),
    });
    coinProducerCategory.register(COIN_PRODUCERS);

    // ─── Cumulative-buy upgrades (Accelerator + Multiplier) ────────────────
    // `costFormula` opaque-value-function path (OL-894): the engine's
    // `createScalingPurchasable` runs the closure against the live persistent
    // level ref and handles mirror+sync internally. `bulkPurchase: false`
    // because closure costs aren't bulk-aware (`maxBulkAmount: 1` inside
    // `buildScalingCostRequirement`).
    acceleratorPurchasable = createScalingPurchasable({
      id: ACCELERATOR_DEF.id,
      title: ACCELERATOR_DEF.name,
      description: ACCELERATOR_DEF.description,
      resource: coins,
      costFormula: (level: DecimalSource) => getAcceleratorCost(level),
      bulkPurchase: false,
    });

    multiplierPurchasable = createScalingPurchasable({
      id: MULTIPLIER_DEF.id,
      title: MULTIPLIER_DEF.name,
      description: MULTIPLIER_DEF.description,
      resource: coins,
      costFormula: (level: DecimalSource) => getMultiplierCost(level),
      bulkPurchase: false,
    });

    // Free-X aggregators. Each chain composes additively: `apply(0)` returns
    // the sum of `add`-bound modifiers (filtered by their `enabled` predicate).
    // Achievement counter grants and (later) Upgrades 7/8/9/11 bind here.
    freeAcceleratorChain = createModifierChain('coin/free-accelerator');
    freeMultiplierChain = createModifierChain('coin/free-multiplier');
    acceleratorPowerBonusChain = createModifierChain('coin/accelerator-power-bonus');

    // Accelerator + Multiplier rate-effect bindings into all 5 coin producers.
    // Canonical `acceleratorEffect` and `multiplierEffect` (Synergism.ts) compose
    // into globalCoinMultiplier; here they bind directly into per-producer
    // rateChains as the engine-idiomatic surface. First-arc math:
    //   acceleratorEffect ≈ (acceleratorPower + powerBonus) ^ (bought + free)
    //   multiplierEffect  ≈ multiplierPower  ^ (bought + free)
    // Free-Accelerator / free-Multiplier / acceleratorPower-bonus aggregators
    // come from achievement counter grants (leaf 7) and the cumulative-buy
    // rework around upgrades 7/8/9/11.
    for (const entry of coinProducerCategory.getAll()) {
      const chain = entry.producer.rateChain;
      chain.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => {
            const base = Decimal.add(
              SCALER_BALANCE.acceleratorPower,
              acceleratorPowerBonusChain.apply(0),
            );
            const total = Decimal.add(
              acceleratorPurchasable.amount.value,
              freeAcceleratorChain.apply(0),
            );
            return Decimal.pow(base, total);
          },
          description: 'Accelerator',
        }),
      });
      chain.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => {
            const total = Decimal.add(
              multiplierPurchasable.amount.value,
              freeMultiplierChain.apply(0),
            );
            return Decimal.pow(SCALER_BALANCE.multiplierPower, total);
          },
          description: 'Multiplier',
        }),
      });
    }

    // ─── Upgrades-tab grid (positions 1-20) ────────────────────────────────
    const gameState = buildScalerGameState();
    coinUpgradesCategory = createPurchasableCategory<UpgradeDef>({
      id: 'coin-upgrades',
      mapPurchasable: (def) => {
        const grants = def.effects
          .map((e) => expandUpgradeGrant(e, gameState))
          .filter((g): g is NonNullable<typeof g> => g !== undefined);
        return {
          display: { title: def.name, description: def.description },
          requirements: createCostRequirement({
            resource: coins,
            cost: Decimal.pow(10, def.costLog),
          }),
          limit: 1,
          grants,
        };
      },
    });
    coinUpgradesCategory.register(COIN_UPGRADES);
  },
};
