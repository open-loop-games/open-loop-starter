import type { Ref } from 'vue';
import {
  createOverrideRegistry,
  createResource,
  createProducerCategory,
  persistent,
  trackTotal,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type OverrideRegistry,
  type ProducerCategory,
  type Resource,
} from 'open-loop-engine';
import type { ProducerData, ProducerDef } from '../data/types';

/**
 * Per-producer state. Manual-trigger producers (click) use this for an
 * activation-count tracker — the engine's `producer.count` is `1` for
 * non-purchasable producers, so click activations need their own counter.
 * Continuous producers return `undefined`.
 */
export type ProducerInstanceState =
  | {
      count: Ref<number>;
      activate: () => void;
    }
  | undefined;

export const PrimaryResourceKey: InjectionKey<Resource<DecimalSource>> = Symbol(
  'producer/primary-resource',
) as InjectionKey<Resource<DecimalSource>>;

export const PrimaryLifetimeKey: InjectionKey<Ref<DecimalSource>> = Symbol(
  'producer/primary-lifetime',
) as InjectionKey<Ref<DecimalSource>>;

export const BuildingsKey: InjectionKey<ProducerCategory<ProducerDef, ProducerInstanceState>> =
  Symbol('producer/buildings') as InjectionKey<
    ProducerCategory<ProducerDef, ProducerInstanceState>
  >;

/**
 * Typed surface for scoped balance/sim/tuning overrides. Keys represent the
 * knobs the balance solver bisects and the workbench / devtools can retune
 * at runtime via `registry.pushScope`.
 */
export type ProducerTunableKey =
  | 'producers/cursor/purchase/baseCost'
  | 'producers/grandma/purchase/baseCost'
  | 'balance/milestoneBonusPerTier'
  | 'balance/tier1UpgradeMultiplier'
  | 'balance/achievementMultiplier';
// `balance/producerCostGrowth` is intentionally absent: the engine's
// ProducerMapping.purchase.costScaling is static `DecimalSource`, not
// Computable — the value is read once at producer registration and can't
// be retuned via tunable() without an engine change. File as candidate
// primitive when a fork wants to bisect this knob.

export type ProducerTunables = Record<string, () => DecimalSource>;

export const ProducerTuningRegistryKey: InjectionKey<OverrideRegistry<ProducerTunables>> = Symbol(
  'producer/tuning-registry',
) as InjectionKey<OverrideRegistry<ProducerTunables>>;

export function createProducersModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/producers',
    install(ctx) {
      const tuningRegistry = createOverrideRegistry<ProducerTunables>('producer-tuning');

      const primaryResource = createResource<DecimalSource>(0, {
        displayName: 'Cookies',
        precision: 0,
        id: 'cookies',
      });

      const primaryLifetime = trackTotal(primaryResource);

      const buildings = createProducerCategory<ProducerDef, ProducerInstanceState>({
        id: 'producer/buildings',
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: primaryResource,
          baseRate: def.baseRate,
          trigger: def.trigger,
          display: def.name,
          purchase: def.purchase
            ? {
                costResource: primaryResource,
                baseCost: TUNABLE_BASE_COST_IDS.has(def.id)
                  ? tunable(
                      tuningRegistry,
                      `producers/${def.id}/purchase/baseCost`,
                      () => def.purchase!.baseCost,
                    )
                  : def.purchase.baseCost,
                costScaling: def.purchase.costScaling,
              }
            : undefined,
        }),
        mapState: (def, producer) => {
          if (def.trigger !== 'manual' || !producer.activate) return undefined;
          const count = persistent<number>(0, { name: 'activations' });
          const fire = producer.activate;
          return {
            count,
            activate: () => {
              fire();
              count.value += 1;
            },
          };
        },
      });
      buildings.register(data.producers);

      ctx.provide(PrimaryResourceKey, primaryResource);
      ctx.provide(PrimaryLifetimeKey, primaryLifetime);
      ctx.provide(BuildingsKey, buildings);
      ctx.provide(ProducerTuningRegistryKey, tuningRegistry);
    },
  };
}

// Producers whose baseCost is registered with the tuning registry. Others
// pass their baseCost through unchanged — tunable adoption is opt-in per
// engine convention (grep for `tunable(` to audit the tuning surface).
const TUNABLE_BASE_COST_IDS = new Set(['cursor', 'grandma']);
