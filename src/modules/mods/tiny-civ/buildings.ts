/**
 * Tiny Civilization — era-1 buildings + pin slots (5d).
 *
 * `createPurchasableCategory` with 4 entries (hut, farm, workshop, storage),
 * each with a multi-resource scaling cost built from an array of
 * {@link createCostRequirement}. Effects land through modifier chains bound
 * once at install (`foodProductionChain` for farms, the per-inventory capacity
 * chains for storage) — the `active` predicate on each binding gates the
 * effect by `amount.value > 0` so buying the first copy turns it on.
 *
 * Pin slots live here (one `WorkerId | null` per pinnable building type) but
 * the sequencer-strategy swap is delegated to the worker subsystem via
 * {@link TinyCivWorkers.pinWorker}/{@link TinyCivWorkers.unpin}. Buildings own
 * "which worker is pinned to this building"; workers own "what strategy is
 * this sequencer running". The UI reads both.
 */
import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  createAdditiveModifier,
  createBooleanRequirement,
  createCostRequirement,
  createPurchasableCategory,
  withPersistentContext,
  type DecimalSource,
  type Inventory,
  type ModifierChain,
  type Purchasable,
  type PurchasableCategory,
  type Requirement,
  type Resource,
} from 'open-loop-engine';
import {
  BUILDING_DEFS,
  FARM_BASE_RATE,
  HUT_POP_PER_COPY,
  LIBRARY_BASE_RATE,
  MARKETPLACE_BASE_RATE,
  MINES_BASE_RATE,
  STORAGE_CAP_PER_COPY,
  TECH_DEFS,
  type BuildingDef,
  type BuildingId,
  type ResourceKind,
  type TechDef,
  type TechId,
  type WorkerId,
} from './content';

/**
 * Worker-side surface `buildings.ts` needs to delegate pin swaps. Kept
 * narrow to avoid pulling the full `TinyCivWorkers` type (and thus its
 * transitive deps) into this file's public contract.
 */
export interface PinDelegate {
  pinWorker(workerId: WorkerId, buildingId: BuildingId): void;
  unpin(workerId: WorkerId): void;
  /** Which building a worker is currently pinned to (null if not pinned). */
  pinnedBy: Record<WorkerId, BuildingId | null>;
}

/**
 * Every resource a building cost might reference. Era-1 costs only draw from
 * food/wood/stone, but widening to the full record means era-2+ buildings
 * priced in tools / leather / etc. drop in without rethreading the wiring.
 */
export type BuildingResources = Record<ResourceKind, Resource<DecimalSource>>;

export interface TinyCivBuildings {
  category: PurchasableCategory<BuildingDef>;
  /** Active pop cap from huts. Consumed by 5f worker-expansion logic. */
  popCap: ComputedRef<Decimal>;
  /** True once the player owns at least one workshop. Consumed by 5e. */
  hasWorkshop: ComputedRef<boolean>;
  /**
   * Returns the WorkerId currently pinned to a building, or null. Drives the
   * UI's pin-slot display without the layout needing to reach into workers.
   */
  pinnedWorker(buildingId: BuildingId): WorkerId | null;
  /** Pin `workerId` to `buildingId`; delegates to the worker subsystem. */
  pinWorker(buildingId: BuildingId, workerId: WorkerId): void;
  /** Release whichever worker is pinned to `buildingId`, if any. */
  unpinBuilding(buildingId: BuildingId): void;
}

export interface BuildingWiring {
  resources: BuildingResources;
  /** Wood-side capacity chain entry point ({@link Inventory.addCapacityModifier}). */
  woodStockpile: Inventory;
  /** Stone-side capacity chain entry point. */
  stoneStockpile: Inventory;
  /**
   * Per-resource production chains. Farm binds onto `food`, mines onto `iron`,
   * marketplace onto `gold`, library onto `manuscripts`. The tick loop in
   * index.ts sums each chain and deposits. Passed as a full record so era-2+
   * producers can drop in without rethreading the wiring.
   */
  productionChains: Record<ResourceKind, ModifierChain>;
  /** Worker subsystem used to swap sequencer strategies on pin/unpin. */
  workers: PinDelegate;
  /**
   * Tech category — used to resolve {@link BuildingDef.requiresTech} into a
   * {@link createBooleanRequirement}. Buildings without `requiresTech` are
   * unaffected.
   */
  techCategory: PurchasableCategory<TechDef>;
}

export function createTinyCivBuildings(wiring: BuildingWiring): TinyCivBuildings {
  const { resources, woodStockpile, stoneStockpile, productionChains, workers, techCategory } =
    wiring;

  const techName = (id: TechId): string =>
    TECH_DEFS.find((t) => t.id === id)?.name ?? id;

  // Categorize-then-register lives inside a persistent context so each
  // purchasable's `amount` ref is bucketed under 'tiny-civ-buildings' in the
  // save and attributed to that scope in the chain registry.
  const category = withPersistentContext('tiny-civ-buildings', () =>
    createPurchasableCategory<BuildingDef>({
      id: 'tiny-civ-buildings',
      mapPurchasable: (def) => {
        const costReqs: Requirement[] = def.baseCosts.map((c) => {
          const res = resources[c.resource];
          const base = c.amount;
          return createCostRequirement({
            resource: res,
            cost: () => {
              // Scale each cost line individually using the shared priceRatio
              // and the current amount owned. `purchasable.amount.value` is
              // read via the closure below — the closure resolves `lookup()`
              // each evaluation so the ref-of-self reference is safe.
              const owned = lookup(def.id)?.amount.value ?? 0;
              return Decimal.mul(base, Decimal.pow(def.priceRatio, owned));
            },
            description: `${c.amount} ${c.resource}`,
          });
        });

        const techReqs: Requirement[] =
          def.requiresTech == null
            ? []
            : [
                createBooleanRequirement({
                  requirement: () =>
                    techCategory.getPurchasable(def.requiresTech as TechId)?.bought.value ??
                    false,
                  description: `${techName(def.requiresTech)} tech`,
                }),
              ];

        return {
          display: { title: def.name, description: def.description },
          requirements: [...costReqs, ...techReqs],
          limit: Decimal.dInf,
        };
      },
    }),
  );

  category.register(BUILDING_DEFS);

  const lookup = (id: BuildingId): Purchasable | undefined => category.getPurchasable(id);

  const amountOf = (id: BuildingId): ComputedRef<Decimal> =>
    computed(() => {
      const p = lookup(id);
      return p == null ? Decimal.dZero : new Decimal(p.amount.value);
    });

  const hutAmount = amountOf('hut');
  const farmAmount = amountOf('farm');
  const workshopAmount = amountOf('workshop');
  const storageAmount = amountOf('storage');
  const minesAmount = amountOf('mines');
  const marketplaceAmount = amountOf('marketplace');
  const libraryAmount = amountOf('library');

  // Farm passive production: additive into the food-production chain. The
  // chain is ticked by index.ts; this binding only contributes when at least
  // one farm exists (keeps `apply(0)` at zero before first purchase).
  productionChains.food.bind({
    active: () => farmAmount.value.gt(0),
    modifier: createAdditiveModifier({
      addend: () => Decimal.mul(FARM_BASE_RATE, farmAmount.value),
      description: 'Farm passive production',
    }),
  });

  // Era-1 Masonry-gated: mines → iron.
  productionChains.iron.bind({
    active: () => minesAmount.value.gt(0),
    modifier: createAdditiveModifier({
      addend: () => Decimal.mul(MINES_BASE_RATE, minesAmount.value),
      description: 'Mines',
    }),
  });

  // Era-2 Currency-gated: marketplace → gold, library → manuscripts.
  productionChains.gold.bind({
    active: () => marketplaceAmount.value.gt(0),
    modifier: createAdditiveModifier({
      addend: () => Decimal.mul(MARKETPLACE_BASE_RATE, marketplaceAmount.value),
      description: 'Marketplace',
    }),
  });
  productionChains.manuscripts.bind({
    active: () => libraryAmount.value.gt(0),
    modifier: createAdditiveModifier({
      addend: () => Decimal.mul(LIBRARY_BASE_RATE, libraryAmount.value),
      description: 'Library',
    }),
  });

  // Storage extends wood + stone caps equally. `addCapacityModifier` pushes
  // onto the inventory's own chain; the inventory's `capacity` computed
  // reflects it reactively.
  woodStockpile.addCapacityModifier(
    createAdditiveModifier({
      addend: () => Decimal.mul(STORAGE_CAP_PER_COPY, storageAmount.value),
      description: 'Storage building',
      enabled: () => storageAmount.value.gt(0),
    }),
  );
  stoneStockpile.addCapacityModifier(
    createAdditiveModifier({
      addend: () => Decimal.mul(STORAGE_CAP_PER_COPY, storageAmount.value),
      description: 'Storage building',
      enabled: () => storageAmount.value.gt(0),
    }),
  );

  const popCap = computed(() => Decimal.mul(HUT_POP_PER_COPY, hutAmount.value));
  const hasWorkshop = computed(() => workshopAmount.value.gt(0));

  const pinnedWorker = (buildingId: BuildingId): WorkerId | null => {
    for (const id of Object.keys(workers.pinnedBy) as WorkerId[]) {
      if (workers.pinnedBy[id] === buildingId) return id;
    }
    return null;
  };

  const pinWorker = (buildingId: BuildingId, workerId: WorkerId): void => {
    const def = BUILDING_DEFS.find((d) => d.id === buildingId);
    if (def == null || !def.pinnable) return;
    workers.pinWorker(workerId, buildingId);
  };

  const unpinBuilding = (buildingId: BuildingId): void => {
    const current = pinnedWorker(buildingId);
    if (current != null) workers.unpin(current);
  };

  return {
    category,
    popCap,
    hasWorkshop,
    pinnedWorker,
    pinWorker,
    unpinBuilding,
  };
}
