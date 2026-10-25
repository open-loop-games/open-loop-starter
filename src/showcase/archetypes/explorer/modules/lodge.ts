import {
  computed,
  createCostRequirement,
  createProducerCategory,
  createPurchasableCategory,
  createResource,
  createScalingPurchasable,
  toNumber,
  tunable,
  unref,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ProducerCategory,
  type PurchasableCategory,
  type Resource,
  type Purchasable,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import {
  ANCHORS,
  GEAR,
  HOUND_PACK,
  HOUND_PROWESS,
  HOUND_SUPPLY_PER_STEP,
  PRODUCERS,
  RACK_BASE_COST,
  RACK_JERKY_RATE,
  RACK_PRICE_RATIO,
  START_JERKY,
  START_WOOD,
  WOOD_PER_JERKY,
  type Currency,
  type GearDef,
  type GearId,
  type ProducerDef,
  type ProducerId,
} from '../data';
import { ChronicleKey } from './chronicle';
import { ExplorerTuningRegistryKey } from './tuning';

/**
 * Lodge module — the economy at home: the stores, the producers that run while
 * the huntsman is out, the smokehouse that turns meat and wood into jerky, and
 * the outfitter. Every purchase here is spent on reaching further into the wold.
 */

export type LodgeStore = Currency;

export interface LodgeApi {
  stores: Record<LodgeStore, Resource<DecimalSource>>;
  producers: ProducerCategory<ProducerDef>;
  racks: Purchasable;
  /** jerky per second the racks managed on the last tick */
  smokeRate: ComputedRef<number>;
  /** jerky per rack per second at full feed */
  rackJerkyRate: ComputedRef<number>;
  /** wood each jerky burns */
  woodPerJerky: ComputedRef<number>;
  gear: PurchasableCategory<GearDef>;
  gearLevel(id: GearId): number;
  hounds: ComputedRef<number>;
  /** each hound's share added to the pack, to prowess, and to a tile's jerky */
  houndPack: ComputedRef<number>;
  houndProwess: ComputedRef<number>;
  houndSupplyPerStep: ComputedRef<number>;
  buyGear(id: GearId): boolean;
  buyProducer(id: ProducerId): boolean;
  buyRack(): boolean;
}

export const LodgeKey: InjectionKey<LodgeApi> = Symbol('explorer/lodge') as InjectionKey<LodgeApi>;

const lodgeApi = createModuleApi(LodgeKey);

/** The stores, the yard, the racks and the gear. Read it after the engine starts. */
export const getLodge = lodgeApi.get;

export function createLodgeModule(): EngineModule {
  return {
    id: 'explorer/lodge',
    dependencies: ['explorer/tuning', 'explorer/chronicle'],
    install(ctx) {
      const registry = ctx.inject(ExplorerTuningRegistryKey);
      const chronicle = ctx.inject(ChronicleKey);

      // === STORES ===

      const stores: Record<LodgeStore, Resource<DecimalSource>> = {
        meat: createResource<DecimalSource>(0, { id: 'meat', displayName: 'Meat' }),
        hide: createResource<DecimalSource>(0, { id: 'hide', displayName: 'Hides' }),
        antler: createResource<DecimalSource>(0, { id: 'antler', displayName: 'Antler' }),
        wood: createResource<DecimalSource>(START_WOOD, { id: 'wood', displayName: 'Wood' }),
        jerky: createResource<DecimalSource>(START_JERKY, { id: 'jerky', displayName: 'Jerky' }),
      };

      // === PRODUCERS ===

      const costRatio = tunable(registry, 'lodge/costRatio', () => ANCHORS.priceRatio);
      const producers = createProducerCategory<ProducerDef>({
        id: 'producers',
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: stores[def.output],
          baseRate: tunable(registry, `lodge/${def.id}/rate`, () => def.rate),
          trigger: 'continuous',
          display: def.displayName,
          purchase: {
            costResource: stores[def.payer],
            baseCost: tunable(registry, `lodge/${def.id}/baseCost`, () => def.baseCost),
            costRatio,
            initialCount: def.initial,
            purchaseMaxByDefault: false,
          },
        }),
      });
      producers.register(PRODUCERS);

      // === SMOKEHOUSE ===
      // Each rack turns meat and wood into jerky, and its throughput is the
      // minimum its inputs can feed.

      const racks = createScalingPurchasable({
        id: 'racks',
        title: 'Smoke rack',
        description: 'Smokes meat into jerky over a wood fire.',
        resource: stores.wood,
        baseCost: tunable(registry, 'racks/baseCost', () => RACK_BASE_COST),
        costRatio: tunable(registry, 'racks/costRatio', () => RACK_PRICE_RATIO),
        initialCount: 1,
        purchaseMaxByDefault: false,
      });
      const rackJerkyRate = tunable(registry, 'racks/jerkyRate', () => RACK_JERKY_RATE);
      const woodPerJerky = tunable(registry, 'racks/woodPerJerky', () => WOOD_PER_JERKY);

      // The racks are a converter over the rack purchasable's count, so the count keeps
      // its save key. A won game smokes nothing.
      const smokehouse = createProducerCategory<{ id: 'rack' }>({
        id: 'smokehouse',
        registerTick: ctx.onTick,
        mapProducer: () => ({
          resource: stores.jerky,
          baseRate: () => (chronicle.won.value ? 0 : rackJerkyRate.value),
          trigger: 'continuous',
          extraCount: racks.count,
          inputs: {
            meat: { resource: stores.meat, per: 1 / ANCHORS.jerkyPerMeat },
            wood: { resource: stores.wood, per: woodPerJerky },
          },
        }),
      });
      smokehouse.register({ id: 'rack' });
      const rack = smokehouse.getProducer('rack')!;
      const smokeRate = computed(() => toNumber(rack.realizedRate!.value));

      // === OUTFITTER ===

      const costCurrencies = (def: GearDef): LodgeStore[] => {
        const seen = new Set<LodgeStore>();
        for (let l = 0; l < def.limit; l++) {
          for (const [k, v] of Object.entries(def.cost(l))) if (v) seen.add(k as LodgeStore);
        }
        return [...seen];
      };

      const gear = createPurchasableCategory<GearDef>({
        id: 'gear',
        mapPurchasable: (def) => ({
          display: { title: def.displayName, description: def.blurb, showCount: def.limit > 1 },
          limit: def.limit,
          purchaseMaxByDefault: false,
          // A table-priced ladder (the spine's per-band budgets), not a Formula, so single purchase.
          requirements: (level) =>
            costCurrencies(def).map((cur) =>
              createCostRequirement({
                resource: stores[cur],
                cost: () => def.cost(toNumber(unref(level)))[cur] ?? 0,
              }),
            ),
        }),
      });
      gear.register(GEAR);
      const gearLevel = (id: GearId): number => toNumber(gear.getPurchasable(id)?.count.value ?? 0);
      const hounds = computed(() => gearLevel('hounds'));

      const api: LodgeApi = {
        stores,
        producers,
        racks,
        smokeRate,
        rackJerkyRate,
        woodPerJerky,
        gear,
        gearLevel,
        hounds,
        houndPack: tunable(registry, 'hounds/pack', () => HOUND_PACK),
        houndProwess: tunable(registry, 'hounds/prowess', () => HOUND_PROWESS),
        houndSupplyPerStep: tunable(registry, 'hounds/supplyPerStep', () => HOUND_SUPPLY_PER_STEP),
        buyGear(id) {
          const p = gear.getPurchasable(id);
          if (!p?.canPurchase.value) return false;
          p.purchase(1);
          const level = toNumber(p.count.value);
          const name = GEAR.find((g) => g.id === id)!.displayName;
          chronicle.say(`New gear: ${name}${p.limit !== 1 ? ` (${level})` : ''}.`, 'good');
          chronicle.beat(`${id} ${level}`);
          return true;
        },
        buyProducer(id) {
          const r = producers.getProducer(id)?.purchasable;
          if (!r?.canPurchase.value) return false;
          r.purchase(1);
          chronicle.beat('first lodge purchase');
          return true;
        },
        buyRack() {
          if (!racks.canPurchase.value) return false;
          racks.purchase(1);
          chronicle.beat('first lodge purchase');
          return true;
        },
      };
      lodgeApi.publish(ctx, api);
    },
  };
}
