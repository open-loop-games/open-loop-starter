import { computed, type ComputedRef, type Ref } from 'vue';
import {
  createResource,
  createProducerCategory,
  persistent,
  trackTotal,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
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

// The engine's Persistent<T> and trackTotal() return types use a Vue Ref
// brand from their own vue install; the starter's Vue declares a separate
// brand. Both are structurally identical `{ value: T }` reactive refs at
// runtime, so we cross the boundary once via structural casts.
type Ref2<T> = { value: T };
const asRef = <T>(r: Ref2<T>): Ref<T> => r as unknown as Ref<T>;

export function createProducersModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/producers',
    install(ctx) {
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
                baseCost: def.purchase.baseCost,
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
        clickCount: asRef(clickCount),
        lastClickSec: asRef(lastClickSec),
        elapsedSec: asRef(elapsedSec),
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
      ctx.provide(PrimaryLifetimeKey, asRef(primaryLifetime));
      ctx.provide(BuildingsKey, buildings);
      ctx.provide(ClickStateKey, clickState);
      ctx.provide(HeadlineRateKey, headlineRate);
      ctx.provide(AllRateChainsKey, allChains);
      ctx.provide(ProducerDataKey, data);
    },
  };
}
