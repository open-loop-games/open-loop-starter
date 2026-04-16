/**
 * AD dimension wiring — Layer 0.
 *
 * Each dimension is a cascade producer: Dim 1 → antimatter, Dim N>1 → Dim N-1.
 * The engine's `createProducerCategory` hardwires `count = repeatable.amount`
 * or `count = 1`, neither of which fits AD: a dim's effective count is its
 * purchased count PLUS accumulated fractional production from the tier above.
 * So we hand-roll the wiring using lower-level primitives — a `Resource` per
 * dim tracks total count, a `Purchasable` tracks bought-for-cost-scaling,
 * `onPurchase` writes through to the Resource, and a single tick handler
 * fans production down the tier ladder.
 *
 * (Feedback for OL-408: whether ProducerCategory should grow an escape hatch
 * for cascade shapes is a call the AD layers 4c/4e+ will inform.)
 */
import { computed, watch, type ComputedRef } from 'vue';
import {
  Decimal,
  addResource,
  createResource,
  createPurchasable,
  createCostRequirement,
  createModifierChain,
  createMultiplicativeModifier,
  type DecimalSource,
  type Resource,
  type Purchasable,
  type ModifierChain,
  type EngineContext,
} from 'open-loop-engine';
import { BUY_TEN_MULTIPLIER, type DimensionDef } from './content';

export interface ADDimension {
  def: DimensionDef;
  /** Effective count: bought + accumulated fractional production from above. */
  count: Resource<DecimalSource>;
  /** Tracks bought-for-cost-scaling; on purchase, writes to `count`. */
  purchasable: Purchasable;
  /** Per-dim modifier chain. Already includes the global productionChain and the buy-10 multiplier. */
  rateChain: ModifierChain;
  /** `baseRate` run through `rateChain`. */
  computedRate: ComputedRef<DecimalSource>;
}

export interface DimensionLayer {
  antimatter: Resource<DecimalSource>;
  /**
   * Lifetime max antimatter within the current run. Feeds the IP gain
   * formula (`10^(log10(max)/308 − 0.75)`). Resets to 0 on Layer 1 reset
   * via the `'ad-layer0'` scope.
   */
  maxAntimatter: Resource<DecimalSource>;
  dims: ADDimension[];
  /** Surface-wide chain — 4c/4e hook cross-layer multipliers here. */
  productionChain: ModifierChain;
}

/**
 * Install the Layer 0 dimension cascade. Must be called inside a persistent
 * context named `'ad-layer0'` so `resetModules: ['ad-layer0']` resolves in 4c.
 */
export function installDimensions(
  ctx: EngineContext,
  opts: { startingAntimatter: DecimalSource; dimensions: DimensionDef[] },
): DimensionLayer {
  const antimatter = createResource<DecimalSource>(opts.startingAntimatter, {
    id: 'antimatter',
    displayName: 'Antimatter',
  });
  const maxAntimatter = createResource<DecimalSource>(opts.startingAntimatter, {
    id: 'max-antimatter',
    displayName: 'Max Antimatter',
  });
  watch(
    () => antimatter.value,
    (v) => {
      if (Decimal.gt(v, maxAntimatter.value)) maxAntimatter.value = v;
    },
  );

  const productionChain = createModifierChain('ad-production');
  const dims: ADDimension[] = [];

  for (const def of opts.dimensions) {
    const count = createResource<DecimalSource>(Decimal.dZero, {
      id: `${def.id}-count`,
      displayName: def.name,
    });
    const rateChain = createModifierChain(`ad-${def.id}-rate`);
    rateChain.add(productionChain);

    // The cost getter reads `purchasable.amount.value` lazily; the closure
    // resolves `purchasable` on each invocation, by which point the
    // createPurchasable() call has returned.
    const purchasable: Purchasable = createPurchasable({
      id: def.id,
      display: {
        title: def.name,
        description: def.description,
      },
      requirements: createCostRequirement({
        resource: antimatter,
        cost: () => {
          const packs = Decimal.floor(Decimal.div(purchasable.amount.value, 10));
          return Decimal.mul(def.baseCost, Decimal.pow(def.baseCostMultiplier, packs));
        },
      }),
      limit: Decimal.dInf,
      onPurchase: (amount) => {
        addResource(count, amount);
      },
    });

    rateChain.add(
      createMultiplicativeModifier({
        multiplier: () => {
          const packs = Decimal.floor(Decimal.div(purchasable.amount.value, 10));
          return Decimal.pow(BUY_TEN_MULTIPLIER, packs);
        },
        description: 'Buy-10 bonus',
      }),
    );

    const computedRate = computed(() =>
      Decimal.fromValue(rateChain.apply(def.baseRate)),
    );

    dims.push({ def, count, purchasable, rateChain, computedRate });
  }

  // Cascade production. Walk high tier → low so a freshly-added tick for Dim N
  // lands in Dim N-1's count before Dim N-1's own tick reads it. This one-tick
  // propagation delay matches AD source behavior (see antimatter-dimension.js
  // `AntimatterDimensions.tick`).
  ctx.onTick((dt) => {
    for (let i = dims.length - 1; i >= 0; i--) {
      const dim = dims[i];
      const target = i === 0 ? antimatter : dims[i - 1].count;
      const amount = Decimal.mul(
        Decimal.mul(dim.computedRate.value, dim.count.value),
        dt,
      );
      if (Decimal.gt(amount, 0)) {
        addResource(target, amount);
      }
    }
  });

  return { antimatter, maxAntimatter, dims, productionChain };
}
