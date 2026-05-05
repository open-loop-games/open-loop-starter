import {
  addResource,
  createOverrideRegistry,
  createResource,
  createProducerCategory,
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
 * Per-producer state. Manual-trigger producers (click) expose the wrapped
 * activate handler that grants the cookie yield and increments the click-
 * count Resource. The count itself lives on the registered Resource so a
 * Gate can read it via `cumulative-gte` over `'click-count'`.
 */
export type ProducerInstanceState =
  | {
      activate: () => void;
    }
  | undefined;

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

// Module-scope handles set during install. Sibling modules + composables
// + UI import the typed accessors below; balance scripts that take an
// `engine: Engine` parameter use `engine.tryInject(ResourceRegistryKey)`
// or `CategoriesKey` instead.
let primaryResource: Resource<DecimalSource>;
let buildings: ProducerCategory<ProducerDef, ProducerInstanceState>;
let clickCountResource: Resource<DecimalSource>;

export function getPrimaryResource(): Resource<DecimalSource> {
  return primaryResource;
}

export function getBuildings(): ProducerCategory<ProducerDef, ProducerInstanceState> {
  return buildings;
}

export function getClickCount(): Resource<DecimalSource> {
  return clickCountResource;
}

export function createProducersModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/producers',
    install(ctx) {
      const tuningRegistry = createOverrideRegistry<ProducerTunables>('producer-tuning');

      primaryResource = createResource<DecimalSource>(0, {
        displayName: 'Cookies',
        precision: 0,
        id: 'cookies',
      });

      // Click activations as a tracked Resource — Gate's `cumulative-gte`
      // reads `Resource.cumulative` (intrinsic to every persistent resource)
      // for the hidden click-count achievements without an archetype
      // accessor.
      clickCountResource = createResource<DecimalSource>(0, {
        displayName: 'Clicks',
        precision: 0,
        id: 'click-count',
      });

      buildings = createProducerCategory<ProducerDef, ProducerInstanceState>({
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
          const fire = producer.activate;
          return {
            activate: () => {
              fire();
              addResource(clickCountResource, 1);
            },
          };
        },
      });
      buildings.register(data.producers);

      ctx.provide(ProducerTuningRegistryKey, tuningRegistry);
    },
  };
}

// Producers whose baseCost is registered with the tuning registry. Others
// pass their baseCost through unchanged — tunable adoption is opt-in per
// engine convention (grep for `tunable(` to audit the tuning surface).
const TUNABLE_BASE_COST_IDS = new Set(['cursor', 'grandma']);
