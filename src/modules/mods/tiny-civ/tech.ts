/**
 * Tiny Civilization — tech tree + era derivation (5f).
 *
 * Nine techs in a prerequisite DAG, registered at install into one
 * {@link createPurchasableCategory}. Each tech's requirements array mixes cost
 * requirements with {@link createBooleanRequirement} entries pointing at each
 * prereq's `bought.value`. `limit: 1` makes every tech a one-shot — the
 * `bought` computed on the purchasable is the signal downstream code reads.
 *
 * Effect bindings are wired inside {@link createTinyCivTech} rather than
 * encoded on {@link TechDef}. Effects need live references to modifier chains
 * and inventories from the caller; pushing them into data would force closures
 * into the content file. Each non-gateway tech binds exactly one effect, gated
 * by `() => tech.bought.value` — bindings land at install and re-activate
 * automatically on load through reactivity.
 *
 * Era derivation: `era = currencyBought ? 2 : agricultureBought ? 1 : 0`. Eras
 * and tech tiers are distinct — a tier-2 tech like Mathematics exists at era 2
 * because its prereq (Currency) is the era-2 gateway, not because the tier
 * itself drives the era. Only the two gateways change era.
 *
 * Era transitions (banner + zone unlock) fire through {@link installEraWatch}
 * with `watch(era, ...)`, non-immediate: loading a save already in era 2 does
 * not re-fire the transition handler. Zone unlocks persist through the
 * ZoneSystem's own persistent `unlocked` ref, so reload state is intact even
 * though the watch is silent.
 */
import { computed, watch, type ComputedRef, type WatchStopHandle } from 'vue';
import {
  createAdditiveModifier,
  createBooleanRequirement,
  createCostRequirement,
  createMultiplicativeModifier,
  createPurchasableCategory,
  withPersistentContext,
  type DecimalSource,
  type Inventory,
  type ModifierChain,
  type Purchasable,
  type PurchasableCategory,
  type Resource,
  type ZoneSystem,
} from 'open-loop-engine';
import {
  TECH_DEFS,
  TECH_EFFECTS,
  type EraId,
  type ResourceKind,
  type TechDef,
  type TechId,
} from './content';

export interface TinyCivTechWiring {
  resources: Record<ResourceKind, Resource<DecimalSource>>;
  woodStockpile: Inventory;
  stoneStockpile: Inventory;
  /** The same chain farm production binds into; tech multipliers stack here. */
  foodProductionChain: ModifierChain;
  /** Multiplies hide bounty rewards before deposit (workers.ts reads it). */
  hideRewardChain: ModifierChain;
  /** Multiplies recipe outputs before deposit (crafting.ts reads it). */
  craftingOutputChain: ModifierChain;
  zones: ZoneSystem;
}

export interface EraToastSink {
  addToast: (title: string, content: string, autoHideMs: number) => void;
}

export interface TinyCivTech {
  category: PurchasableCategory<TechDef>;
  era: ComputedRef<EraId>;
  /** Direct accessor for a tech's {@link Purchasable}. Throws if unregistered. */
  tech: (id: TechId) => Purchasable;
  /**
   * Set up the era-transition watcher. Caller owns the stop handle; the
   * module tears it down in its own lifecycle. Non-immediate — reload in
   * era 2 does not re-fire handlers.
   */
  installEraWatch: (sink: EraToastSink) => WatchStopHandle;
}

const TECH_BY_ID: Record<TechId, TechDef> = Object.fromEntries(
  TECH_DEFS.map((d) => [d.id, d]),
) as Record<TechId, TechDef>;

export function createTinyCivTech(wiring: TinyCivTechWiring): TinyCivTech {
  // Explicit annotation breaks a TS inference cycle: `mapPurchasable` closes
  // over `category` to resolve prereq refs lazily, but TS can't infer the
  // type of `category` while it's mid-initialization from that closure.
  const category: PurchasableCategory<TechDef> = withPersistentContext('tiny-civ-tech', () =>
    createPurchasableCategory<TechDef>({
      id: 'tiny-civ-tech',
      mapPurchasable: (def) => {
        const costReqs = def.costs.map((c) =>
          createCostRequirement({
            resource: wiring.resources[c.resource],
            cost: c.amount,
            description: `${c.amount} ${c.resource}`,
          }),
        );
        const prereqReqs = def.prereqs.map((prereqId) =>
          createBooleanRequirement({
            requirement: () => {
              const p = category.getPurchasable(prereqId);
              return p != null && p.bought.value;
            },
            description: TECH_BY_ID[prereqId].name,
          }),
        );
        return {
          display: { title: def.name, description: def.description },
          requirements: [...costReqs, ...prereqReqs],
          limit: 1,
          onPurchase: () => {
            // Per-tech side effects. Gateway techs intentionally do NOT unlock
            // their era's zones here — that's the `watch(era)` handler's job,
            // keeping the gateway/era split crisp. Non-gateway zone unlocks
            // (Masonry → mines) live here.
            if (def.id === 'masonry') {
              wiring.zones.unlock('mines');
            }
          },
        };
      },
    }),
  );

  category.register(TECH_DEFS);

  const tech = (id: TechId): Purchasable => {
    const p = category.getPurchasable(id);
    if (p == null) {
      throw new Error(`tiny-civ tech '${id}' not registered`);
    }
    return p;
  };

  const era: ComputedRef<EraId> = computed(() => {
    if (tech('currency').bought.value) return 2;
    if (tech('agriculture').bought.value) return 1;
    return 0;
  });

  // Pottery — +20 wood cap
  wiring.woodStockpile.addCapacityModifier(
    createAdditiveModifier({
      addend: TECH_EFFECTS.potteryWoodCapBonus,
      description: 'Pottery',
      enabled: () => tech('pottery').bought.value,
    }),
  );

  // Hunting — ×1.5 on hide bounty rewards
  wiring.hideRewardChain.bind({
    active: () => tech('hunting').bought.value,
    modifier: createMultiplicativeModifier({
      multiplier: TECH_EFFECTS.huntingHideMultiplier,
      description: 'Hunting',
    }),
  });

  // Masonry — +25 stone cap (mines-zone unlock lives in onPurchase above)
  wiring.stoneStockpile.addCapacityModifier(
    createAdditiveModifier({
      addend: TECH_EFFECTS.masonryStoneCapBonus,
      description: 'Masonry',
      enabled: () => tech('masonry').bought.value,
    }),
  );

  // Animal Husbandry — ×1.2 on farm food production (chain multiplies after
  // farm additive is summed in)
  wiring.foodProductionChain.bind({
    active: () => tech('animal-husbandry').bought.value,
    modifier: createMultiplicativeModifier({
      multiplier: TECH_EFFECTS.animalHusbandryFarmMultiplier,
      description: 'Animal Husbandry',
    }),
  });

  // Mathematics — ×1.25 on every recipe output (chain applied in crafting)
  wiring.craftingOutputChain.bind({
    active: () => tech('mathematics').bought.value,
    modifier: createMultiplicativeModifier({
      multiplier: TECH_EFFECTS.mathematicsCraftingMultiplier,
      description: 'Mathematics',
    }),
  });

  // Engineering — +30 wood cap and +30 stone cap (two separate bindings so
  // the capacity breakdown shows the source on each inventory chain)
  wiring.woodStockpile.addCapacityModifier(
    createAdditiveModifier({
      addend: TECH_EFFECTS.engineeringWoodCapBonus,
      description: 'Engineering',
      enabled: () => tech('engineering').bought.value,
    }),
  );
  wiring.stoneStockpile.addCapacityModifier(
    createAdditiveModifier({
      addend: TECH_EFFECTS.engineeringStoneCapBonus,
      description: 'Engineering',
      enabled: () => tech('engineering').bought.value,
    }),
  );

  // Writing — ×1.2 on farm food production (compounds multiplicatively with
  // Animal Husbandry: both techs bought gives 1.44× base farm)
  wiring.foodProductionChain.bind({
    active: () => tech('writing').bought.value,
    modifier: createMultiplicativeModifier({
      multiplier: TECH_EFFECTS.writingFarmMultiplier,
      description: 'Writing',
    }),
  });

  const installEraWatch = (sink: EraToastSink): WatchStopHandle =>
    watch(era, (next) => {
      if (next === 1) {
        wiring.zones.unlock('hills');
        sink.addToast('Era', 'You have entered the Settlement era', 6000);
      } else if (next === 2) {
        wiring.zones.unlock('marsh');
        sink.addToast('Era', 'You have entered the Commerce era', 6000);
      }
    });

  return { category, era, tech, installEraWatch };
}
