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
 *   piecewise-super-exponential (`Buy.ts:33-77` + `:163-197`), beyond
 *   `createScalingPurchasable`'s closed-form geometric scaling. Hand-rolled
 *   with the cost-mirror pattern lifted from `purchasable.ts:672-728`.
 * - `coinUpgrades` (createPurchasableCategory) — Upgrades-tab grid positions
 *   1-20. Each entry's `grants[]` resolves the data-side `UpgradeGrant.scope`
 *   into one or more producer rateChain bindings; `tier-global` scope binds
 *   into all 5 coin producers' chains via the array form of `Grant.chain`.
 * - `coinReset` — declared structurally; the prestige conversion that fires it
 *   lands in a later leaf.
 *
 * Cross-tier binding pattern (locked at this leaf, propagates forward):
 * sibling tier modules import `coinProducers` directly (ES import — no
 * injection key). Cross-tier upgrades grant via `coinProducers.getProducer(id)
 * .rateChain`. Engine `ChainRegistryKey` exists for balance-workbench
 * introspection only; binding lookups stay typed via direct import.
 *
 * Reset glob behavior: `getModulePersistentRefs('scaler-coin')` walks the
 * parent→child context tree (verified `persistence.ts:660-676`) — every
 * per-def category sub-context (`coin-producers/coin-1`, `coin-upgrades/upgrade-1`,
 * etc.) registers as a child of the module's context and is collected
 * automatically. `keep: []` because nothing in the coin tier survives the
 * coin-layer reset.
 *
 * Citation: `Reset.ts:418-433` for the canonical coin reset baseline.
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
  type Reset,
  bn,
  createResource,
  createProducerCategory,
  createPurchasable,
  createPurchasableCategory,
  createCostRequirement,
  createMultiplicativeModifier,
  createReset,
  persistent,
  type Persistent,
  withPersistentContext,
} from 'open-loop-engine';
import { watch } from 'vue';
import {
  COIN_PRODUCERS,
  ACCELERATOR_DEF,
  MULTIPLIER_DEF,
  COIN_UPGRADES,
  SCALER_BALANCE,
  type ProducerDef,
  type UpgradeDef,
  type ScalerGameState,
  type Tier,
  type UpgradeGrant,
} from '../data';

// ============================================================================
// Module state (populated in install)
// ============================================================================

let coins: Resource<DecimalSource>;
let coinProducerCategory: ProducerCategory<ProducerDef, void>;
let acceleratorPurchasable: Purchasable;
let multiplierPurchasable: Purchasable;
let coinUpgradesCategory: PurchasableCategory<UpgradeDef, void>;
let coinReset: Reset;

// Persistent mirrors for cumulative-buy cost closures. Both refs save under
// per-purchasable sub-contexts; the watch keeps each in lockstep with its
// purchasable's `amount`.
let acceleratorAmountMirror: Persistent<DecimalSource>;
let multiplierAmountMirror: Persistent<DecimalSource>;

// Inert later-arc state stand-ins. `player.upgrades[101..105]` (cascade gate)
// and `transcendShards` / `firstGeneratedMythos` etc. are referenced by the
// coin tier's canonical math but don't exist in leaf 1's module set. They
// port as zero-default refs that other tier leaves can swap to live state.
//
// TODO(expansion): replace with real cross-tier reads when the prestige
// (Crystal upgrades, prestigePoints), transcend (mythos producers,
// transcendPoints), and upgrades-101..105 (cascade gate) leaves land.
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

/** The coin layer reset. Fired by the prestige conversion when it lands. */
export function getCoinReset(): Reset {
  return coinReset;
}

// ============================================================================
// Game-state accessor (typed read-view used by upgrade closures)
// ============================================================================

/**
 * Build a `ScalerGameState` over live engine refs. Captured once at install
 * time and threaded into upgrade-grant closures via the category mapper.
 *
 * Methods that reach into not-yet-ported tiers return `0` (inert) — the
 * upgrade math sees identity behavior until those tiers land.
 */
function buildGameState(): ScalerGameState {
  return {
    producerOwned(tier: Tier, producerId: string): DecimalSource {
      if (tier !== 'coin') return ZERO;
      return coinProducerCategory.getProducer(producerId)?.ownedCount.value ?? ZERO;
    },
    totalOwned(tier: Tier): DecimalSource {
      if (tier !== 'coin') return ZERO;
      let total: DecimalSource = ZERO;
      for (const entry of coinProducerCategory.getAll()) {
        total = Decimal.add(total, entry.producer.ownedCount.value);
      }
      return total;
    },
    resourceValue(_id: string): DecimalSource {
      // No prestige / transcend resources at leaf 1 — every cross-tier read
      // resolves identity. Each later tier leaf wires its own resources here.
      return ZERO;
    },
    upgradeBought(position: number): boolean {
      const def = COIN_UPGRADES.find((u) => u.position === position);
      if (!def) return false;
      return coinUpgradesCategory.getPurchasable(def.id)?.active.value ?? false;
    },
    acceleratorBought(): DecimalSource {
      return acceleratorPurchasable?.amount.value ?? ZERO;
    },
    multiplierBought(): DecimalSource {
      return multiplierPurchasable?.amount.value ?? ZERO;
    },
  };
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
// Upgrade grant expansion (data → engine `Grant[]`)
// ============================================================================

/**
 * Resolve a data-side `UpgradeGrant` into one or more engine `Grant` entries.
 * `tier-global` scope binds the same multiplier into every producer's
 * rateChain in the tier (array form of `Grant.chain`); `producer` scope
 * resolves to one chain by id.
 */
function expandUpgradeGrant(grant: UpgradeGrant, state: ScalerGameState) {
  const { scope, multiplier, description } = grant;

  const chains = (() => {
    if (scope.kind === 'producer') {
      return coinProducerCategory.getProducer(scope.producerId)?.rateChain;
    }
    // tier-global: array of all 5 producer rateChains
    return coinProducerCategory.getAll().map((e) => e.producer.rateChain);
  })();

  if (chains == null || (Array.isArray(chains) && chains.length === 0)) {
    return undefined;
  }

  return {
    chain: chains,
    mult: () => multiplier(state),
    description,
  };
}

// ============================================================================
// Engine module
// ============================================================================

export const coinModule: EngineModule = {
  id: 'scaler-coin',

  install(ctx: EngineContext) {
    coins = createResource(0, { displayName: 'coins', precision: 0 });

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
    // Mirror pattern per `purchasable.ts:672-728`: the cost closure reads
    // from a separate persistent ref written sync-flushed by a watch on the
    // purchasable's amount. Both refs save; loading rehydrates the amount,
    // and `immediate: true` syncs the mirror on the same tick.
    acceleratorAmountMirror = withPersistentContext('scaler-coin/accelerator', () =>
      persistent<DecimalSource>(0, { name: 'amountMirror' }),
    );
    acceleratorPurchasable = createPurchasable({
      id: ACCELERATOR_DEF.id,
      display: { title: ACCELERATOR_DEF.name, description: ACCELERATOR_DEF.description },
      requirements: createCostRequirement({
        resource: coins,
        cost: () => getAcceleratorCost(acceleratorAmountMirror.value),
      }),
      bulkPurchase: false,
    });
    watch(
      () => acceleratorPurchasable.amount.value,
      (v) => {
        acceleratorAmountMirror.value = v;
      },
      { immediate: true, flush: 'sync' },
    );

    multiplierAmountMirror = withPersistentContext('scaler-coin/multiplier', () =>
      persistent<DecimalSource>(0, { name: 'amountMirror' }),
    );
    multiplierPurchasable = createPurchasable({
      id: MULTIPLIER_DEF.id,
      display: { title: MULTIPLIER_DEF.name, description: MULTIPLIER_DEF.description },
      requirements: createCostRequirement({
        resource: coins,
        cost: () => getMultiplierCost(multiplierAmountMirror.value),
      }),
      bulkPurchase: false,
    });
    watch(
      () => multiplierPurchasable.amount.value,
      (v) => {
        multiplierAmountMirror.value = v;
      },
      { immediate: true, flush: 'sync' },
    );

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
    const gameState = buildGameState();
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

    // ─── Coin-layer reset ──────────────────────────────────────────────────
    // Canonical baseline `Reset.ts:418-433` zeros the coin tier currency,
    // producer owned + generated counts, producer cost mirrors, and
    // Accelerator/Multiplier amounts. The engine's `getModulePersistentRefs`
    // walks parent→child contexts (`scaler-coin` → `coin-producers/coin-N`,
    // `scaler-coin/accelerator`, `scaler-coin/multiplier`, `coin-upgrades/upgrade-N`),
    // so `resetModules: ['scaler-coin']` covers every per-def sub-context
    // automatically.
    //
    // `keep: []` — nothing in the coin tier survives the coin-layer reset
    // (canonical: prestige currencies are kept by the prestige module's
    // reset, not here).
    coinReset = createReset({
      resetModules: ['scaler-coin'],
      keep: [],
    });
  },
};
