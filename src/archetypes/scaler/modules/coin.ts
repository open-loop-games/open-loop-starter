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
  bn,
  createResource,
  createProducerCategory,
  createScalingPurchasable,
  createPurchasableCategory,
  createCostRequirement,
  createMultiplicativeModifier,
} from 'open-loop-engine';
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

// ============================================================================
// Module state (populated in install)
// ============================================================================

let coins: Resource<DecimalSource>;
let coinProducerCategory: ProducerCategory<ProducerDef, void>;
let acceleratorPurchasable: Purchasable;
let multiplierPurchasable: Purchasable;
let coinUpgradesCategory: PurchasableCategory<UpgradeDef, void>;

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

    // Accelerator + Multiplier rate-effect bindings into all 5 coin producers.
    // Canonical `acceleratorEffect` and `multiplierEffect` (Synergism.ts) compose
    // into globalCoinMultiplier; here they bind directly into per-producer
    // rateChains as the engine-idiomatic surface. First-arc math:
    //   acceleratorEffect ≈ acceleratorPower ^ totalAccelerator
    //   multiplierEffect  ≈ multiplierPower  ^ totalMultiplier
    // Free-Accelerator and free-Multiplier contributions (canonical
    // `freeAccelerator` / `freeMultiplier`) port with the upgrade rework that
    // adds upgrades 7/8/9/11.
    for (const entry of coinProducerCategory.getAll()) {
      const chain = entry.producer.rateChain;
      chain.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () =>
            Decimal.pow(SCALER_BALANCE.acceleratorPower, acceleratorPurchasable.amount.value),
          description: 'Accelerator',
        }),
      });
      chain.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () =>
            Decimal.pow(SCALER_BALANCE.multiplierPower, multiplierPurchasable.amount.value),
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
