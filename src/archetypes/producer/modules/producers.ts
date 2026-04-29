import { computed } from 'vue';
import type { ComputedRef, Ref } from 'vue';
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
  type ModifierChain,
  type OverrideRegistry,
  type Producer,
  type ProducerCategory,
  type Resource,
} from 'open-loop-engine';
import type { ProducerData, ProducerDef } from '../data/types';

// Injection keys — consumed by upgrades, achievements, composables, sim tests.

export interface ClickState {
  clickCount: Ref<number>;
  lastClickSec: Ref<number>;
  elapsedSec: Ref<number>;
  click: () => void;
}

export const PrimaryResourceKey: InjectionKey<Resource<DecimalSource>> = Symbol(
  'producer/primary-resource',
) as InjectionKey<Resource<DecimalSource>>;

export const PrimaryLifetimeKey: InjectionKey<Ref<DecimalSource>> = Symbol(
  'producer/primary-lifetime',
) as InjectionKey<Ref<DecimalSource>>;

export const BuildingsKey: InjectionKey<ProducerCategory<ProducerDef>> = Symbol(
  'producer/buildings',
) as InjectionKey<ProducerCategory<ProducerDef>>;

export const ClickStateKey: InjectionKey<ClickState> = Symbol(
  'producer/click-state',
) as InjectionKey<ClickState>;

export const HeadlineRateKey: InjectionKey<ComputedRef<DecimalSource>> = Symbol(
  'producer/headline-rate',
) as InjectionKey<ComputedRef<DecimalSource>>;

// Ordered `[click, ...continuous]` rateChains — the grant target for any
// effect that wants to modify every production stream at once (global
// upgrades, achievement rewards). Built once in the producers module so
// downstream modules inject instead of re-walking `data.producers`.
export const AllRateChainsKey: InjectionKey<ModifierChain[]> = Symbol(
  'producer/all-rate-chains',
) as InjectionKey<ModifierChain[]>;

export const ProducerDataKey: InjectionKey<ProducerData> = Symbol(
  'producer/data',
) as InjectionKey<ProducerData>;

/**
 * Typed surface for scoped balance/sim/tuning overrides. Keys represent the
 * knobs the balance solver bisects and the workbench / devtools can retune
 * at runtime via `registry.pushScope`. Each reader site registers its key
 * with `tunable(registry, key, () => defaultFromData)`; a scope-push swaps
 * the reader without mutating data.
 *
 * Typed as a `Record` (not an interface with named keys) to satisfy
 * `OverrideRegistry`'s generic constraint. The canonical key list lives as
 * the `ProducerTunableKey` union and is enforced at push-scope call sites
 * via `Partial<Record<ProducerTunableKey, () => DecimalSource>>`.
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

      const clickCount = persistent<number>(0, { name: 'clickCount' });
      const lastClickSec = persistent<number>(0, { name: 'lastClickSec' });
      const elapsedSec = persistent<number>(0, { name: 'elapsedSec' });

      ctx.onTick((dt: number) => {
        elapsedSec.value += dt;
      });

      const buildings = createProducerCategory<ProducerDef>({
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
                baseCost: wrapBaseCost(tuningRegistry, def),
                costScaling: def.purchase.costScaling,
              }
            : undefined,
        }),
      });
      buildings.register(data.producers);

      const clickProducer: Producer | undefined = buildings.getProducer('click');
      if (!clickProducer || !clickProducer.activate) {
        throw new Error('Producer "click" missing or not manual — expected trigger: "manual"');
      }
      const activate = clickProducer.activate;

      const clickState: ClickState = {
        clickCount,
        lastClickSec,
        elapsedSec,
        click: () => {
          activate();
          clickCount.value += 1;
          lastClickSec.value = elapsedSec.value;
        },
      };

      const headlineRate = computed(() => buildings.getTotalRate(primaryResource));

      const continuousChains: ModifierChain[] = [];
      for (const p of data.producers) {
        if (p.trigger !== 'continuous') continue;
        const producer = buildings.getProducer(p.id);
        if (producer) continuousChains.push(producer.rateChain);
      }
      const allChains: ModifierChain[] = [clickProducer.rateChain, ...continuousChains];

      ctx.provide(PrimaryResourceKey, primaryResource);
      ctx.provide(PrimaryLifetimeKey, primaryLifetime);
      ctx.provide(BuildingsKey, buildings);
      ctx.provide(ClickStateKey, clickState);
      ctx.provide(HeadlineRateKey, headlineRate);
      ctx.provide(AllRateChainsKey, allChains);
      ctx.provide(ProducerDataKey, data);
      ctx.provide(ProducerTuningRegistryKey, tuningRegistry);
    },
  };
}

// Producers whose baseCost is registered with the tuning registry. Others
// pass their baseCost through unchanged — tunable adoption is opt-in per
// engine convention (grep for `tunable(` to audit the tuning surface).
const TUNABLE_BASE_COST_IDS = new Set(['cursor', 'grandma']);

/**
 * Wrap a producer's static baseCost behind a tunable key so scope-push can
 * retune it without mutating data. The tunable's default closure reads
 * `def.purchase.baseCost`, so unscoped runs behave identically to the
 * pre-tunable direct path.
 */
function wrapBaseCost(
  registry: OverrideRegistry<ProducerTunables>,
  def: ProducerDef,
): DecimalSource | ReturnType<typeof tunable<DecimalSource>> {
  if (!def.purchase) throw new Error(`wrapBaseCost called on ${def.id} without purchase config`);
  if (!TUNABLE_BASE_COST_IDS.has(def.id)) return def.purchase.baseCost;
  const key = `producers/${def.id}/purchase/baseCost` as keyof ProducerTunables;
  return tunable(registry, key, () => def.purchase!.baseCost);
}
