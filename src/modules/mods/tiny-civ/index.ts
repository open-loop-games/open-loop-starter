/**
 * Tiny Civilization — total-conversion archetype mod.
 *
 * 5b skeleton (OL-479): three resources (food/wood/stone), a ZoneSystem
 * covering camp + forest + hills with camp/forest unlocked, and a
 * placeholder click-gather-food action.
 *
 * 5c (OL-480): three Majesty-style workers racing for entries in a shared
 * bounty pool. Workers live in `./workers.ts`; click-gather carries forward
 * as a minor manual option.
 *
 * 5d (OL-481): era-1 buildings (hut/farm/workshop/storage) and worker
 * pinning. Wood and stone migrate from plain Resources to
 * {@link createInventory}-linked resources so Storage buildings can extend
 * per-resource caps via {@link Inventory.addCapacityModifier}. Farm passive
 * food production runs through a tick-driven {@link ModifierChain}. Pinning
 * is delegated to the worker subsystem; pin slots are owned by buildings.
 *
 * State shape:
 *   - `'tiny-civ-layer0'`     — food amount (uncapped)
 *   - `'tiny-civ-wood'`       — Inventory-linked wood resource + cap state
 *   - `'tiny-civ-stone'`      — Inventory-linked stone resource + cap state
 *   - `'tiny-civ-zones'`      — ZoneSystem's own `unlocked` + `current` refs
 *   - `'tiny-civ-bounties'`   — shared bounty pool
 *   - `'tiny-civ-worker-N'`   — per-worker sequencer + rotation index
 *   - `'worker-N:seq'`        — per-worker sequencer's own state
 *   - `'tiny-civ-buildings'`  — per-building purchasable amounts
 */
import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  addResource,
  createInventory,
  createModifierChain,
  createResource,
  createZoneSystem,
  withPersistentContext,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Inventory,
  type ModifierChain,
  type Resource,
  type DecimalSource,
  type ZoneSystem,
} from 'open-loop-engine';
import { setSlot } from '@/modules/ui-registry';
import TinyCivLayout from '@/ui/layouts/TinyCivLayout.vue';
import {
  zoneDefs,
  INITIAL_UNLOCKED_ZONES,
  STARTING_RESOURCE,
  CLICK_GATHER_FOOD,
  BASE_STONE_CAP,
  BASE_WOOD_CAP,
} from './content';
import { createTinyCivWorkers, type TinyCivWorkers } from './workers';
import { createTinyCivBuildings, type TinyCivBuildings } from './buildings';

export interface TinyCivState {
  food: Resource<DecimalSource>;
  wood: Resource<DecimalSource>;
  stone: Resource<DecimalSource>;
  /** Wood inventory — UI reads `capacity.value` for the n/cap HUD display. */
  woodStockpile: Inventory;
  /** Stone inventory — UI reads `capacity.value` for the n/cap HUD display. */
  stoneStockpile: Inventory;
  zones: ZoneSystem;
  /** Combined passive-food-per-second, summed over all contributing farms. */
  foodPerSecond: ComputedRef<Decimal>;
  /** Adds {@link CLICK_GATHER_FOOD} to `food`. Placeholder mechanic for 5b. */
  gatherFood: () => void;
  /** Majesty-inspired indirect-control worker pool. */
  workers: TinyCivWorkers;
  /** Era-1 buildings + pin state. */
  buildings: TinyCivBuildings;
}

export const TinyCivKey: InjectionKey<TinyCivState> =
  Symbol('tiny-civ') as InjectionKey<TinyCivState>;

export function createTinyCivModule(): EngineModule {
  return {
    id: 'tiny-civ',
    dependencies: ['settings', 'ui-registry'],
    install(ctx: EngineContext) {
      const { food } = withPersistentContext('tiny-civ-layer0', () => ({
        food: createResource<DecimalSource>(STARTING_RESOURCE, { displayName: 'Food' }),
      }));

      const woodStockpile = createInventory({
        id: 'tiny-civ-wood',
        baseCapacity: BASE_WOOD_CAP,
        overflow: 'destroy',
        items: ['wood'],
      });
      const stoneStockpile = createInventory({
        id: 'tiny-civ-stone',
        baseCapacity: BASE_STONE_CAP,
        overflow: 'destroy',
        items: ['stone'],
      });
      const wood = woodStockpile.resources.get('wood') as Resource<DecimalSource>;
      const stone = stoneStockpile.resources.get('stone') as Resource<DecimalSource>;

      const zones = createZoneSystem({
        id: 'tiny-civ-zones',
        zones: zoneDefs,
        initiallyUnlocked: [...INITIAL_UNLOCKED_ZONES],
      });

      const gatherFood = () => {
        addResource(food, new Decimal(CLICK_GATHER_FOOD));
      };

      const workers = createTinyCivWorkers(
        ctx,
        { food, wood, stone },
        { wood: woodStockpile, stone: stoneStockpile },
      );

      const foodProductionChain: ModifierChain = createModifierChain('tc-food-production');

      const buildings = createTinyCivBuildings({
        resources: { food, wood, stone },
        woodStockpile,
        stoneStockpile,
        foodProductionChain,
        workers,
      });

      // Farm passive income: chain applies over 0 each tick; result is
      // food/sec that we multiply by dt. When no farm is owned, the chain's
      // only contributing binding is gated inactive, so `apply(0)` stays 0.
      ctx.onTick((dt) => {
        const rate = foodProductionChain.apply(0);
        if (Decimal.gt(rate, 0)) {
          addResource(food, Decimal.mul(rate, dt));
        }
      });

      const foodPerSecond = computed(() => new Decimal(foodProductionChain.apply(0)));

      const state: TinyCivState = {
        food,
        wood,
        stone,
        woodStockpile,
        stoneStockpile,
        zones,
        foodPerSecond,
        gatherFood,
        workers,
        buildings,
      };
      ctx.provide(TinyCivKey, state);

      setSlot('game-layout', TinyCivLayout);
    },
  };
}

export const tinyCivModule: EngineModule = createTinyCivModule();
