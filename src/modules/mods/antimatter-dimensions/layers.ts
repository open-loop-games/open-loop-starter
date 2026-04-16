/**
 * AD prestige layers — Layer 1 (Infinity Points) lives here; Layer 2 lands in 4e.
 *
 * Layer 1 wires:
 *   - `'ad-layer1'` persistent context: IP resource, IP upgrade state, run timer.
 *   - `'ad-meta'` persistent context: `hasReachedInfinity`, `lifetimeInfinities`,
 *     `totalTimePlayed`. Never a `resetModules` target — state here survives
 *     every prestige tier.
 *   - `layer1Reset = createReset({ resetModules: ['ad-layer0'] })` — the first
 *     shipped consumer of composed `resetModules` outside the engine's own
 *     `integration-prestige-tree.test.ts`.
 *   - Custom invertible `Formula` for the canonical AD IP curve
 *     `10^(log10(maxAntimatter)/308 − 0.75)`. Chains `log10 → div → sub → pow10`,
 *     each of which has an engine-provided invert, so the resulting formula is
 *     naturally invertible and feeds `conversion.nextAt`.
 *   - Cross-layer multipliers via `createPersistentEffectSystem` (matches the
 *     idiom in `src/modules/mods/prestige.ts`).
 */
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
import { ipUpgradeDefs, type IPUpgradeDef } from './content';
import type { DimensionLayer } from './dimensions';

export interface Layer1State {
  infinityPoints: Resource<DecimalSource>;
  /** Seconds since the most recent Layer 1 reset (or engine start if none yet). */
  infinityTimer: Persistent<number>;
  /** Seconds of cumulative play time across all runs. Powers `totalTimeMult`. */
  totalTimePlayed: Persistent<number>;
  /** First-infinity gate. Unlocks the Infinity tab and stays true forever. */
  hasReachedInfinity: Persistent<boolean>;
  /** Count of Layer 1 resets performed. Drives `dim14mult`. */
  lifetimeInfinities: Resource<DecimalSource>;
  conversion: Conversion;
  layer1Reset: Reset;
  ipUpgrades: PurchasableCategory<IPUpgradeDef>;
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
    return { infinityPoints, infinityTimer, ipUpgrades };
  });
  layer1.ipUpgrades.register(ipUpgradeDefs);

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

  const dim14Mult = () =>
    createMultiplicativeModifier({
      multiplier: () => Decimal.add(1, Decimal.mul(meta.lifetimeInfinities.value, 0.2)),
      description: 'Tier Resonance',
    });
  effects.register({
    id: 'ip-upgrade:dim14mult',
    active: isBought('dim14mult'),
    modifiers: [
      { chain: layer0.dims[0].rateChain, modifier: dim14Mult },
      { chain: layer0.dims[3].rateChain, modifier: dim14Mult },
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
    infinityTimer: layer1.infinityTimer,
    totalTimePlayed: meta.totalTimePlayed,
    hasReachedInfinity: meta.hasReachedInfinity,
    lifetimeInfinities: meta.lifetimeInfinities,
    conversion,
    layer1Reset,
    ipUpgrades: layer1.ipUpgrades,
  };
}
