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
 * 5e (OL-482): era-1 crafting recipes. Six new resources land —
 * hide/herbs/salt (bounty-sourced side materials, two of them zone-bound)
 * and tools/leather/medicine (recipe outputs). The ad-hoc food production
 * chain generalises to a per-resource registry keyed by {@link ResourceKind};
 * the tick loop sums every chain. A new {@link BountyDef.requiresZone} field
 * gates the hide and salt bounties at the UI layer.
 *
 * State shape:
 *   - `'tiny-civ-layer0'`     — food amount (uncapped)
 *   - `'tiny-civ-wood'`       — Inventory-linked wood resource + cap state
 *   - `'tiny-civ-stone'`      — Inventory-linked stone resource + cap state
 *   - `'tiny-civ-materials'`  — hide/herbs/salt amounts
 *   - `'tiny-civ-crafted'`    — tools/leather/medicine amounts
 *   - `'tiny-civ-zones'`      — ZoneSystem's own `unlocked` + `current` refs
 *   - `'tiny-civ-bounties'`   — shared bounty pool
 *   - `'tiny-civ-worker-N'`   — per-worker sequencer + rotation index
 *   - `'worker-N:seq'`        — per-worker sequencer's own state
 *   - `'tiny-civ-buildings'`  — per-building purchasable amounts
 *   - `'tiny-civ-crafting'`   — per-recipe purchasable amounts (craft counter)
 */
import { computed, shallowRef, type ComputedRef } from 'vue';
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
import { useToasts } from '@/composables/useToasts';
import TinyCivLayout from '@/ui/layouts/TinyCivLayout.vue';
import {
  zoneDefs,
  INITIAL_UNLOCKED_ZONES,
  STARTING_RESOURCE,
  CLICK_GATHER_FOOD,
  BASE_STONE_CAP,
  BASE_WOOD_CAP,
  RESOURCE_DISPLAY,
  RESOURCE_KINDS,
  type ResourceKind,
} from './content';
import { createTinyCivWorkers, type TinyCivWorkers } from './workers';
import { createTinyCivBuildings, type TinyCivBuildings } from './buildings';
import { createTinyCivCrafting, type TinyCivCrafting } from './crafting';
import { createTinyCivTech, type TinyCivTech } from './tech';

export interface TinyCivState {
  /** Full resource record — everything the UI, bounties, and recipes read. */
  resources: Record<ResourceKind, Resource<DecimalSource>>;
  /** Inventories for the capped resources (era-1: wood and stone only). */
  inventories: { wood: Inventory; stone: Inventory };
  /**
   * Per-resource production registry. Buildings, future-era producers, and
   * passive sources bind onto the matching chain; the tick loop applies each
   * one over 0 and deposits the result. Resources with no producer bind
   * nothing and contribute 0/s.
   */
  productionChains: Record<ResourceKind, ModifierChain>;
  /** Reactive per-resource rate (for the left-column resource table). */
  ratePerSecond: Record<ResourceKind, ComputedRef<Decimal>>;
  zones: ZoneSystem;
  /** Adds {@link CLICK_GATHER_FOOD} to `food`. Placeholder mechanic for 5b. */
  gatherFood: () => void;
  workers: TinyCivWorkers;
  buildings: TinyCivBuildings;
  crafting: TinyCivCrafting;
  tech: TinyCivTech;
}

export const TinyCivKey: InjectionKey<TinyCivState> =
  Symbol('tiny-civ') as InjectionKey<TinyCivState>;

export function createTinyCivModule(): EngineModule {
  return {
    id: 'tiny-civ',
    dependencies: ['settings', 'ui-registry'],
    install(ctx: EngineContext) {
      const { food } = withPersistentContext('tiny-civ-layer0', () => ({
        food: createResource<DecimalSource>(STARTING_RESOURCE, {
          displayName: RESOURCE_DISPLAY.food.name,
        }),
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

      // Side-material inputs (hide/herbs/salt) — sourced by gather bounties,
      // consumed by recipes. Uncapped for era-1; granary-style caps are era-2+.
      const materials = withPersistentContext('tiny-civ-materials', () => ({
        hide: createResource<DecimalSource>(0, { displayName: RESOURCE_DISPLAY.hide.name }),
        herbs: createResource<DecimalSource>(0, { displayName: RESOURCE_DISPLAY.herbs.name }),
        salt: createResource<DecimalSource>(0, { displayName: RESOURCE_DISPLAY.salt.name }),
      }));

      // Recipe outputs. Era-1 outputs have no consumer yet — they're tracked
      // purely for the player's sense of accumulation; era-2+ will add
      // buildings and worker expansions that spend them.
      const crafted = withPersistentContext('tiny-civ-crafted', () => ({
        tools: createResource<DecimalSource>(0, { displayName: RESOURCE_DISPLAY.tools.name }),
        leather: createResource<DecimalSource>(0, { displayName: RESOURCE_DISPLAY.leather.name }),
        medicine: createResource<DecimalSource>(0, {
          displayName: RESOURCE_DISPLAY.medicine.name,
        }),
      }));

      // Era-2 resources. Registered up front (per the "register everything,
      // visibility gates downstream" decision) so save shape is stable — iron
      // sits at 0 until mines produce it, same for gold/manuscripts.
      const advanced = withPersistentContext('tiny-civ-advanced', () => ({
        iron: createResource<DecimalSource>(0, { displayName: RESOURCE_DISPLAY.iron.name }),
        gold: createResource<DecimalSource>(0, { displayName: RESOURCE_DISPLAY.gold.name }),
        manuscripts: createResource<DecimalSource>(0, {
          displayName: RESOURCE_DISPLAY.manuscripts.name,
        }),
      }));

      const resources: Record<ResourceKind, Resource<DecimalSource>> = {
        food,
        wood,
        stone,
        hide: materials.hide,
        herbs: materials.herbs,
        salt: materials.salt,
        tools: crafted.tools,
        leather: crafted.leather,
        medicine: crafted.medicine,
        iron: advanced.iron,
        gold: advanced.gold,
        manuscripts: advanced.manuscripts,
      };

      const inventories = { wood: woodStockpile, stone: stoneStockpile };

      const zones = createZoneSystem({
        id: 'tiny-civ-zones',
        zones: zoneDefs,
        initiallyUnlocked: [...INITIAL_UNLOCKED_ZONES],
      });

      // One chain per resource. Producer bindings (farm → food, hut pop cap →
      // pop, era-2 mines → iron, etc.) attach to the matching chain; the
      // tick loop sums and deposits. `apply(0)` over an empty chain is 0,
      // so resources with no producer contribute nothing.
      const productionChains: Record<ResourceKind, ModifierChain> = Object.fromEntries(
        RESOURCE_KINDS.map((kind) => [kind, createModifierChain(`tc-${kind}-production`)]),
      ) as Record<ResourceKind, ModifierChain>;

      const depositTo = (kind: ResourceKind, amount: DecimalSource): void => {
        if (kind === 'wood') {
          woodStockpile.add('wood', amount);
          return;
        }
        if (kind === 'stone') {
          stoneStockpile.add('stone', amount);
          return;
        }
        addResource(resources[kind], amount);
      };

      const gatherFood = () => {
        addResource(food, new Decimal(CLICK_GATHER_FOOD));
      };

      // Cross-cutting modifier chains. `hideRewardChain` is read inside the
      // worker reward dispatch; `craftingOutputChain` is read inside every
      // recipe's onPurchase. Both start empty and identity-apply over their
      // input; tech effects bind multipliers in during tech-system install.
      const hideRewardChain = createModifierChain('tc-hide-reward');
      const craftingOutputChain = createModifierChain('tc-crafting-output');

      // Tech has no peer dependencies on buildings/workers/crafting — it only
      // needs the chains and inventories it binds effects onto, plus zones
      // for mines-unlock. Create it first so `tech.era` + `tech.category`
      // are ready for the downstream consumers.
      const tech = createTinyCivTech({
        resources,
        woodStockpile,
        stoneStockpile,
        foodProductionChain: productionChains.food,
        hideRewardChain,
        craftingOutputChain,
        zones,
      });

      // Buildings holder — workers' popCap gate reads from buildings, but
      // buildings needs `workers` (for pin delegation). Break the cycle with
      // a shallowRef populated after buildings is constructed. `popCap`
      // re-evaluates once the holder flips from null to the built object.
      const buildingsHolder = shallowRef<TinyCivBuildings | null>(null);
      const popCap: ComputedRef<Decimal> = computed(
        () => buildingsHolder.value?.popCap.value ?? Decimal.dZero,
      );

      const workers = createTinyCivWorkers(ctx, resources, inventories, {
        era: tech.era,
        popCap,
        hideRewardChain,
      });

      const buildings = createTinyCivBuildings({
        resources,
        woodStockpile,
        stoneStockpile,
        productionChains,
        workers,
        techCategory: tech.category,
      });
      buildingsHolder.value = buildings;

      const crafting = createTinyCivCrafting({
        resources,
        inventories,
        outputChain: craftingOutputChain,
      });

      // Era transition bundle — banner toast + the era-only zone unlocks
      // (hills at era 1, marsh at era 2). Non-immediate: a reload at era 2
      // does not re-fire the handlers. Zone unlocks persist through the
      // ZoneSystem's own persistent `unlocked` ref.
      const { addToast } = useToasts();
      tech.installEraWatch({ addToast });

      ctx.onTick((dt) => {
        for (const kind of RESOURCE_KINDS) {
          const rate = productionChains[kind].apply(0);
          if (Decimal.gt(rate, 0)) {
            depositTo(kind, Decimal.mul(rate, dt));
          }
        }
      });

      const ratePerSecond: Record<ResourceKind, ComputedRef<Decimal>> = Object.fromEntries(
        RESOURCE_KINDS.map((kind) => [
          kind,
          computed(() => new Decimal(productionChains[kind].apply(0))),
        ]),
      ) as Record<ResourceKind, ComputedRef<Decimal>>;

      const state: TinyCivState = {
        resources,
        inventories,
        productionChains,
        ratePerSecond,
        zones,
        gatherFood,
        workers,
        buildings,
        crafting,
        tech,
      };
      ctx.provide(TinyCivKey, state);

      setSlot('game-layout', TinyCivLayout);
    },
  };
}

export const tinyCivModule: EngineModule = createTinyCivModule();
