/**
 * Tiny Civilization — workshop-gated recipes (5e).
 *
 * Each recipe is a {@link createPurchasable} with `requirements` built from the
 * recipe's input array and `onPurchase` depositing the output. This is the
 * "purchasable-with-output" pattern: unlike {@link createConversion} (strictly
 * 1:1), a purchasable with multi-resource cost and a resource-writing
 * onPurchase handler is the engine-native way to express multi-input crafting.
 *
 * Bulk craft drops out for free — `purchasable.amountToPurchase` already
 * computes the max affordable across every requirement (see
 * {@link Purchasable} / `buildPurchasableComputeds`), so the UI's
 * {@link Purchasable.purchaseMax} button works without any per-resource
 * `calculateMaxAffordable` min-over logic.
 *
 * Workshop gating is handled at the UI layer (`buildings.hasWorkshop.value`
 * controls whether the crafting panel is mounted at all). We intentionally do
 * not wire `visibility: () => hasWorkshop.value` onto each purchasable —
 * recipes stay registered at install regardless, which keeps the save shape
 * stable and leaves the door open for dev toggles to surface them without
 * rebuilding the category.
 */
import {
  Decimal,
  addResource,
  createCostRequirement,
  createPurchasableCategory,
  withPersistentContext,
  type DecimalSource,
  type Inventory,
  type ModifierChain,
  type PurchasableCategory,
  type Resource,
} from 'open-loop-engine';
import { RECIPE_DEFS, type RecipeDef, type ResourceKind } from './content';

export interface CraftingWiring {
  resources: Record<ResourceKind, Resource<DecimalSource>>;
  inventories: { wood: Inventory; stone: Inventory };
  /**
   * Multiplier chain applied to each recipe's output amount before deposit.
   * Starts empty (identity); Mathematics tech binds a ×1.25 modifier onto
   * it. Applied per-purchase rather than per-batch so an `n`-craft still
   * gets the full multiplier stacked once.
   */
  outputChain: ModifierChain;
}

export interface TinyCivCrafting {
  category: PurchasableCategory<RecipeDef>;
}

export function createTinyCivCrafting(wiring: CraftingWiring): TinyCivCrafting {
  const { resources, inventories, outputChain } = wiring;

  // Output deposits honour the same cap-clamp routing workers use for wood/stone
  // so a recipe that somehow produced wood (era-2 salvage, say) could not
  // exceed the stockpile cap. Era-1 recipes only output uncapped resources, so
  // this path is exercised by tools/leather/medicine going through addResource.
  const depositOutput = (kind: ResourceKind, amount: DecimalSource): void => {
    if (kind === 'wood') {
      inventories.wood.add('wood', amount);
      return;
    }
    if (kind === 'stone') {
      inventories.stone.add('stone', amount);
      return;
    }
    addResource(resources[kind], amount);
  };

  const category = withPersistentContext('tiny-civ-crafting', () =>
    createPurchasableCategory<RecipeDef>({
      id: 'tiny-civ-crafting',
      mapPurchasable: (def) => {
        // maxBulkAmount lifts each cost requirement's bulk cap above the
        // default of 1; without it, `maxRequirementsMet` clamps to 1 and
        // `purchaseMax()` only crafts one copy at a time. Infinity lets the
        // min-across-requirements computation drive the cap instead.
        const requirements = def.inputs.map((input) =>
          createCostRequirement({
            resource: resources[input.resource],
            cost: input.amount,
            maxBulkAmount: Decimal.dInf,
            description: `${input.amount} ${input.resource}`,
          }),
        );

        return {
          display: { title: def.name, description: def.description },
          requirements,
          limit: Decimal.dInf,
          onPurchase: (n) => {
            const base = Decimal.mul(def.output.amount, n);
            depositOutput(def.output.resource, outputChain.apply(base));
          },
        };
      },
    }),
  );

  category.register(RECIPE_DEFS);

  return { category };
}
