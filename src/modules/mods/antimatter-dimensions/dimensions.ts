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
  createPersistentEffectSystem,
  createReset,
  type DecimalSource,
  type Resource,
  type Purchasable,
  type ModifierChain,
  type EngineContext,
  type Reset,
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
  /** Surface-wide chain — Layer 1+ cross-layer multipliers hook here. */
  productionChain: ModifierChain;

  // Mid-loop mechanics (OL-467 Layer 0+ expansion)

  /** Number of Dim Boosts performed in the current Infinity run. */
  boostCount: Resource<DecimalSource>;
  /** Number of Antimatter Galaxies performed in the current Infinity run. */
  galaxyCount: Resource<DecimalSource>;
  /** Tickspeed purchases — alternate investment track. Resets on Infinity. */
  tickspeed: Purchasable;
  /** Persistent Dim 8 multiplier accumulated from Dimensional Sacrifices. */
  sacrificeMult: Resource<DecimalSource>;

  /** Cost in Dim 8 count to perform the next Dim Boost. Reactive. */
  boostCost: ComputedRef<DecimalSource>;
  /** Cost in Dim 8 count to perform the next Galaxy. Reactive. */
  galaxyCost: ComputedRef<DecimalSource>;
  /** Gain that the next Dimensional Sacrifice would produce. Reactive. */
  sacrificeGain: ComputedRef<DecimalSource>;

  /** True when Dim 8 count >= boostCost. */
  canBoost: ComputedRef<boolean>;
  /** True when Dim 8 count >= galaxyCost. */
  canGalaxy: ComputedRef<boolean>;
  /** True when Dim 8 count >= 1 (you need a Dim 8 to sacrifice for). */
  canSacrifice: ComputedRef<boolean>;

  /** Perform a Dim Boost: reset Dim 1-7 state, bump boostCount. */
  doBoost: () => boolean;
  /** Perform an Antimatter Galaxy: reset Dim 1-7 state + boostCount, bump galaxyCount. */
  doGalaxy: () => boolean;
  /** Perform a Dimensional Sacrifice: fold sacrificeGain into sacrificeMult, zero Dim 1-7 counts. */
  doSacrifice: () => boolean;
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

    rateChain.bind({
      active: () => Decimal.gte(purchasable.amount.value, 10),
      modifier: () =>
        createMultiplicativeModifier({
          multiplier: () => {
            const packs = Decimal.floor(Decimal.div(purchasable.amount.value, 10));
            return Decimal.pow(BUY_TEN_MULTIPLIER, packs);
          },
          description: 'Buy-10 bonus',
        }),
    });

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

  // --- Mid-loop mechanics (OL-467) --------------------------------------------
  //
  // DimBoost, Galaxy, Tickspeed, and Sacrifice all live in `'ad-layer0'` and
  // reset automatically when Infinity fires (layer1Reset targets this scope).
  // Each mechanic's productionChain modifier is registered once at init via
  // `createPersistentEffectSystem`, matching the idiom from layers.ts:120-168.

  const boostCount = createResource<DecimalSource>(Decimal.dZero, {
    id: 'dim-boost-count',
    displayName: 'Dim Boosts',
  });
  const galaxyCount = createResource<DecimalSource>(Decimal.dZero, {
    id: 'galaxy-count',
    displayName: 'Antimatter Galaxies',
  });
  const sacrificeMult = createResource<DecimalSource>(Decimal.dOne, {
    id: 'sacrifice-mult',
    displayName: 'Sacrifice Multiplier',
  });

  const lowerDims = dims.length >= 8 ? dims.slice(0, 7) : dims;
  const topDim = dims.length >= 8 ? dims[7] : dims[dims.length - 1];

  // Targets for a DimBoost-style reset: every ref that should zero out on the
  // lower tiers. `thingsToReset` walks passed objects recursively, so Resource
  // and Purchasable wrappers flatten to their persistent refs automatically.
  const lowerDimResetTargets: unknown[] = lowerDims.flatMap((d) => [d.count, d.purchasable]);

  const dimBoostReset: Reset = createReset({
    thingsToReset: lowerDimResetTargets,
  });
  const galaxyReset: Reset = createReset({
    thingsToReset: [...lowerDimResetTargets, boostCount],
  });

  const tickspeed: Purchasable = createPurchasable({
    id: 'tickspeed',
    display: {
      title: 'Tickspeed',
      description: 'Speeds up production. ×1.1 to all Antimatter Dimensions per purchase.',
    },
    requirements: createCostRequirement({
      resource: antimatter,
      cost: () => Decimal.mul(1000, Decimal.pow(1.33, tickspeed.amount.value)),
    }),
    limit: Decimal.dInf,
  });

  const boostCost = computed<DecimalSource>(() =>
    Decimal.add(10, Decimal.mul(boostCount.value, 2)),
  );
  const galaxyCost = computed<DecimalSource>(() =>
    Decimal.add(80, Decimal.mul(galaxyCount.value, 20)),
  );
  const sacrificeGain = computed<DecimalSource>(() => {
    const base = Decimal.div(dims[0].count.value, 1000);
    return Decimal.max(1, Decimal.pow(Decimal.max(1, base), 0.5));
  });

  const canBoost = computed(() => Decimal.gte(topDim.count.value, boostCost.value));
  const canGalaxy = computed(() => Decimal.gte(topDim.count.value, galaxyCost.value));
  const canSacrifice = computed(() => Decimal.gte(topDim.count.value, 1));

  function doBoost(): boolean {
    if (!canBoost.value) return false;
    dimBoostReset.reset();
    boostCount.value = Decimal.add(boostCount.value, 1);
    return true;
  }

  function doGalaxy(): boolean {
    if (!canGalaxy.value) return false;
    galaxyReset.reset();
    galaxyCount.value = Decimal.add(galaxyCount.value, 1);
    return true;
  }

  function doSacrifice(): boolean {
    if (!canSacrifice.value) return false;
    sacrificeMult.value = Decimal.mul(sacrificeMult.value, sacrificeGain.value);
    for (const dim of lowerDims) {
      dim.count.value = Decimal.dZero;
    }
    return true;
  }

  const effects = createPersistentEffectSystem({ id: 'ad-layer0-effects' });

  effects.register({
    id: 'midloop:dim-boost-mult',
    active: () => Decimal.gt(boostCount.value, 0),
    modifiers: [
      {
        chain: productionChain,
        modifier: () =>
          createMultiplicativeModifier({
            multiplier: () => Decimal.add(1, Decimal.mul(boostCount.value, 0.5)),
            description: 'Dim Boosts',
          }),
      },
    ],
  });

  effects.register({
    id: 'midloop:galaxy-mult',
    active: () => Decimal.gt(galaxyCount.value, 0),
    modifiers: [
      {
        chain: productionChain,
        modifier: () =>
          createMultiplicativeModifier({
            multiplier: () => Decimal.pow(1.5, galaxyCount.value),
            description: 'Antimatter Galaxies',
          }),
      },
    ],
  });

  effects.register({
    id: 'midloop:tickspeed-mult',
    active: () => Decimal.gt(tickspeed.amount.value, 0),
    modifiers: [
      {
        chain: productionChain,
        modifier: () =>
          createMultiplicativeModifier({
            multiplier: () => Decimal.pow(1.1, tickspeed.amount.value),
            description: 'Tickspeed',
          }),
      },
    ],
  });

  effects.register({
    id: 'midloop:sacrifice-mult',
    active: () => Decimal.gt(sacrificeMult.value, 1),
    modifiers: [
      {
        chain: topDim.rateChain,
        modifier: () =>
          createMultiplicativeModifier({
            multiplier: () => sacrificeMult.value,
            description: 'Dimensional Sacrifice',
          }),
      },
    ],
  });

  return {
    antimatter,
    maxAntimatter,
    dims,
    productionChain,
    boostCount,
    galaxyCount,
    tickspeed,
    sacrificeMult,
    boostCost,
    galaxyCost,
    sacrificeGain,
    canBoost,
    canGalaxy,
    canSacrifice,
    doBoost,
    doGalaxy,
    doSacrifice,
  };
}
