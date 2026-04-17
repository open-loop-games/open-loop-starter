/**
 * AD prestige layers — Layer 1 (Infinity Points) and Layer 2 (Eternity Points).
 *
 * Layer 1 wires:
 *   - `'ad-layer1'` persistent context: IP resource, maxIP, IP upgrade state,
 *     run timer. maxIP tracks per-run max and resets on Eternity via
 *     `layer2Reset`'s cascade into `ad-layer1`.
 *   - `'ad-meta'` persistent context: `hasReachedInfinity`,
 *     `lifetimeInfinities`, `hasReachedEternity`, `lifetimeEternities`,
 *     `totalTimePlayed`. Never a `resetModules` target — state here survives
 *     every prestige tier.
 *   - `layer1Reset = createReset({ resetModules: ['ad-layer0'] })`.
 *   - Custom invertible `Formula` for the canonical AD IP curve
 *     `10^(log10(maxAntimatter)/308 − 0.75)`. Chains `log10 → div → sub → pow10`,
 *     each of which has an engine-provided invert.
 *   - Cross-layer multipliers via `createPersistentEffectSystem`.
 *
 * Layer 2 wires:
 *   - `'ad-layer2'` persistent context: EP resource, EP upgrade state, timer.
 *   - `layer2Reset = createReset({ resetModules: [layer1Reset] })` — the
 *     Reset-to-Reset composition that flattens L1's scope (which itself
 *     includes L0) into a single cascade.
 *   - EP formula `5^(log10(maxIP + IP)/308 − 0.7)` composed as
 *     `Formula.variable(maxIP).add(infinityPoints).log10().div(308).sub(0.7).pow_base(5)` —
 *     fully invertible (the variable is maxIP; `add` treats the raw ref input
 *     as constant during invert).
 *   - Cross-layer multipliers via a second `createPersistentEffectSystem`.
 */
import { watch } from 'vue';
import {
  Decimal,
  Formula,
  createCostRequirement,
  createCumulativeConversion,
  createMultiplicativeModifier,
  createPersistentEffectSystem,
  createPurchasableCategory,
  createReset,
  createResource,
  persistent,
  updateResetTimers,
  withPersistentContext,
  type Conversion,
  type DecimalSource,
  type EngineContext,
  type Persistent,
  type PurchasableCategory,
  type Reset,
  type Resource,
} from 'open-loop-engine';
import {
  epUpgradeDefs,
  ipUpgradeDefs,
  type EPUpgradeDef,
  type IPUpgradeDef,
} from './content';
import type { DimensionLayer } from './dimensions';

export interface Layer1State {
  infinityPoints: Resource<DecimalSource>;
  /** Max Infinity Points within the current Eternity run — feeds EP formula. */
  maxInfinityPoints: Resource<DecimalSource>;
  /** Seconds since the most recent Layer 1 reset (or engine start if none yet). */
  infinityTimer: Persistent<number>;
  /** Seconds of cumulative play time across all runs. Powers `totalTimeMult`. */
  totalTimePlayed: Persistent<number>;
  /** First-infinity gate. Unlocks the Infinity tab and stays true forever. */
  hasReachedInfinity: Persistent<boolean>;
  /** Count of Layer 1 resets performed. Drives `dim18mult`. */
  lifetimeInfinities: Resource<DecimalSource>;
  conversion: Conversion;
  layer1Reset: Reset;
  ipUpgrades: PurchasableCategory<IPUpgradeDef>;
}

export interface Layer2State {
  eternityPoints: Resource<DecimalSource>;
  /** Seconds since the most recent Eternity. */
  eternityTimer: Persistent<number>;
  /** First-eternity gate. Unlocks the Eternity tab and stays true forever. */
  hasReachedEternity: Persistent<boolean>;
  /** Count of Layer 2 resets performed. Drives `eternitiesMult`. */
  lifetimeEternities: Resource<DecimalSource>;
  eternityConversion: Conversion;
  layer2Reset: Reset;
  epUpgrades: PurchasableCategory<EPUpgradeDef>;
}

/**
 * Install the Infinity layer on top of a built Layer 0.
 */
export function installLayer1(ctx: EngineContext, layer0: DimensionLayer): Layer1State {
  const meta = withPersistentContext('ad-meta', () => ({
    hasReachedInfinity: persistent<boolean>(false),
    lifetimeInfinities: createResource<DecimalSource>(Decimal.dZero, {
      id: 'lifetime-infinities',
      displayName: 'Infinities',
    }),
    totalTimePlayed: persistent<number>(0),
  }));

  const layer1Reset = createReset({
    resetModules: ['ad-layer0'],
  });

  const layer1 = withPersistentContext('ad-layer1', () => {
    const infinityPoints = createResource<DecimalSource>(Decimal.dZero, {
      id: 'infinity-points',
      displayName: 'Infinity Points',
    });
    const maxInfinityPoints = createResource<DecimalSource>(Decimal.dZero, {
      id: 'max-infinity-points',
      displayName: 'Max Infinity Points',
    });
    // Own-rolled persistent timer (the engine's `trackResetTime` returns a
    // non-persistent `ref(0)`; we want save-round-trip). Behavior matches:
    // reset zeroes on `afterReset`, ticks advance it via `updateResetTimers`.
    const infinityTimer = persistent<number>(0);
    const ipUpgrades = createPurchasableCategory<IPUpgradeDef>({
      id: 'ad-ip-upgrades',
      mapPurchasable: (def) => ({
        display: { title: def.title, description: def.description },
        requirements: createCostRequirement({ resource: infinityPoints, cost: def.cost }),
        limit: 1,
      }),
    });
    return { infinityPoints, maxInfinityPoints, infinityTimer, ipUpgrades };
  });
  layer1.ipUpgrades.register(ipUpgradeDefs);

  watch(
    () => layer1.infinityPoints.value,
    (v) => {
      if (Decimal.gt(v, layer1.maxInfinityPoints.value)) {
        layer1.maxInfinityPoints.value = v;
      }
    },
  );

  // IP gain formula: 10^(log10(maxAntimatter) / 308 − 0.75).
  // Chain stays invertible — each op has an engine-provided invert — so
  // `conversion.nextAt` resolves correctly.
  const ipFormula = Formula.variable(layer0.maxAntimatter).log10().div(308).sub(0.75).pow10();

  const conversion = createCumulativeConversion({
    baseResource: layer0.maxAntimatter,
    gainResource: layer1.infinityPoints,
    formula: ipFormula,
    minimumGain: 1,
    reset: layer1Reset,
    // No-op spend — the reset wipes the `'ad-layer0'` scope (antimatter,
    // maxAntimatter, dim counts, purchasable levels) which is the correct
    // semantic. The default spend would *also* zero maxAntimatter, which
    // is redundant but not harmful.
    spend: () => {},
  });

  layer1Reset.on('afterReset', () => {
    meta.hasReachedInfinity.value = true;
    meta.lifetimeInfinities.value = Decimal.add(meta.lifetimeInfinities.value, 1);
    layer1.infinityTimer.value = 0;
  });

  const effects = createPersistentEffectSystem({ id: 'ad-layer1-effects' });

  const isBought = (id: string) => () =>
    layer1.ipUpgrades.getPurchasable(id)?.bought.value ?? false;

  effects.register({
    id: 'ip-upgrade:totalTimeMult',
    active: isBought('totalTimeMult'),
    modifiers: [
      {
        chain: layer0.productionChain,
        modifier: () =>
          createMultiplicativeModifier({
            multiplier: () => {
              const minutes = Decimal.div(meta.totalTimePlayed.value, 60);
              return Decimal.max(1, Decimal.pow(Decimal.div(minutes, 2).max(1), 0.15));
            },
            description: 'Time Dilation',
          }),
      },
    ],
  });

  const dim18Mult = () =>
    createMultiplicativeModifier({
      multiplier: () => Decimal.add(1, Decimal.mul(meta.lifetimeInfinities.value, 0.2)),
      description: 'Tier Resonance',
    });
  effects.register({
    id: 'ip-upgrade:dim18mult',
    active: isBought('dim18mult'),
    modifiers: [
      { chain: layer0.dims[0].rateChain, modifier: dim18Mult },
      { chain: layer0.dims[layer0.dims.length - 1].rateChain, modifier: dim18Mult },
    ],
  });

  effects.register({
    id: 'ip-upgrade:buy10Mult',
    active: isBought('buy10Mult'),
    modifiers: layer0.dims.map((dim) => ({
      chain: dim.rateChain,
      modifier: () =>
        createMultiplicativeModifier({
          multiplier: 1.1,
          description: 'Ten-fold Legacy',
        }),
    })),
  });

  ctx.onTick((dt) => {
    meta.totalTimePlayed.value += dt;
    updateResetTimers([layer1.infinityTimer], dt);
  });

  return {
    infinityPoints: layer1.infinityPoints,
    maxInfinityPoints: layer1.maxInfinityPoints,
    infinityTimer: layer1.infinityTimer,
    totalTimePlayed: meta.totalTimePlayed,
    hasReachedInfinity: meta.hasReachedInfinity,
    lifetimeInfinities: meta.lifetimeInfinities,
    conversion,
    layer1Reset,
    ipUpgrades: layer1.ipUpgrades,
  };
}

/**
 * Install the Eternity layer on top of a built Layer 1.
 *
 * - `'ad-layer2'` context: EP + EP upgrades + eternity-run timer.
 * - `'ad-meta'` gains `hasReachedEternity` + `lifetimeEternities`.
 * - `layer2Reset = createReset({ resetModules: [layer1Reset] })` composes
 *   layer1's scope (which already includes `'ad-layer0'`) — scope flattens by
 *   union, so one `.reset()` call cascades through both tiers.
 * - Conversion uses an invertible `Formula` chain rooted in maxIP; `add(IP)`
 *   keeps IP as a live-ref input that `makeBinaryInvert` treats as constant
 *   at invert time, so `nextAt` resolves cleanly.
 */
export function installLayer2(
  ctx: EngineContext,
  layer0: DimensionLayer,
  layer1: Layer1State,
): Layer2State {
  const meta = withPersistentContext('ad-meta', () => ({
    hasReachedEternity: persistent<boolean>(false),
    lifetimeEternities: createResource<DecimalSource>(Decimal.dZero, {
      id: 'lifetime-eternities',
      displayName: 'Eternities',
    }),
  }));

  const layer2Reset = createReset({
    resetModules: [layer1.layer1Reset],
  });

  const layer2 = withPersistentContext('ad-layer2', () => {
    const eternityPoints = createResource<DecimalSource>(Decimal.dZero, {
      id: 'eternity-points',
      displayName: 'Eternity Points',
    });
    const eternityTimer = persistent<number>(0);
    const epUpgrades = createPurchasableCategory<EPUpgradeDef>({
      id: 'ad-ep-upgrades',
      mapPurchasable: (def) => ({
        display: { title: def.title, description: def.description },
        requirements: createCostRequirement({ resource: eternityPoints, cost: def.cost }),
        limit: 1,
      }),
    });
    return { eternityPoints, eternityTimer, epUpgrades };
  });
  layer2.epUpgrades.register(epUpgradeDefs);

  // EP gain: 5^((log10(maxIP + IP) / 308) − 0.7).
  // `Formula.variable(maxIP)` anchors the variable; `.add(infinityPoints)`
  // adds a live ref that invert treats as constant. `pow_base(5)` is
  // `5 ^ <chain-value>` with an engine-provided invert.
  const epFormula = Formula.variable(layer1.maxInfinityPoints)
    .add(layer1.infinityPoints)
    .log10()
    .div(308)
    .sub(0.7)
    .pow_base(5);

  const eternityConversion = createCumulativeConversion({
    baseResource: layer1.maxInfinityPoints,
    gainResource: layer2.eternityPoints,
    formula: epFormula,
    minimumGain: 1,
    reset: layer2Reset,
    // No-op spend — the reset wipes `'ad-layer1'` (which includes maxIP,
    // IP, IP upgrades, infinity timer) and cascades into `'ad-layer0'`.
    spend: () => {},
  });

  layer2Reset.on('afterReset', () => {
    meta.hasReachedEternity.value = true;
    meta.lifetimeEternities.value = Decimal.add(meta.lifetimeEternities.value, 1);
    layer2.eternityTimer.value = 0;
  });

  const effects = createPersistentEffectSystem({ id: 'ad-layer2-effects' });

  const isBought = (id: string) => () =>
    layer2.epUpgrades.getPurchasable(id)?.bought.value ?? false;

  effects.register({
    id: 'ep-upgrade:epMult',
    active: isBought('epMult'),
    modifiers: [
      {
        chain: layer0.productionChain,
        modifier: () =>
          createMultiplicativeModifier({
            multiplier: () => Decimal.add(layer2.eternityPoints.value, 1),
            description: 'Eternal Resonance',
          }),
      },
    ],
  });

  effects.register({
    id: 'ep-upgrade:eternitiesMult',
    active: isBought('eternitiesMult'),
    modifiers: [
      {
        chain: layer0.productionChain,
        modifier: () =>
          createMultiplicativeModifier({
            multiplier: () =>
              Decimal.add(1, Decimal.mul(meta.lifetimeEternities.value, 0.1)),
            description: 'Recursive Endings',
          }),
      },
    ],
  });

  effects.register({
    id: 'ep-upgrade:ipMult',
    active: isBought('ipMult'),
    modifiers: [
      {
        chain: layer0.productionChain,
        modifier: () =>
          createMultiplicativeModifier({
            multiplier: () =>
              Decimal.add(1, Decimal.log10(Decimal.add(layer1.infinityPoints.value, 1))),
            description: 'Infinite Inheritance',
          }),
      },
    ],
  });

  ctx.onTick((dt) => {
    updateResetTimers([layer2.eternityTimer], dt);
  });

  return {
    eternityPoints: layer2.eternityPoints,
    eternityTimer: layer2.eternityTimer,
    hasReachedEternity: meta.hasReachedEternity,
    lifetimeEternities: meta.lifetimeEternities,
    eternityConversion,
    layer2Reset,
    epUpgrades: layer2.epUpgrades,
  };
}
