/**
 * Per-faction purchasable upgrade tree (OL-510).
 *
 * Single linear dimension per target chain (OL-504 cut list — no branching
 * tech DAG). Four upgrades per faction (yield / spread / attack / defense),
 * each a {@link createPurchasableCategory} entry with a scaling cost paid in
 * that faction's essence resource.
 *
 * Chain bindings are installed manually *after* `category.register()`
 * completes. Declarative `grants` would be tidier, but `applyDeclarativeBindings`
 * fires inside the category's `buildInstance` — before the registry knows
 * about the new purchasable. A grant whose `mult` closes over
 * `category.getPurchasable(def.id)` would see `undefined` on its first
 * evaluation (which happens during `chain.bind → resolveDescriptionText`),
 * read no reactive deps, and cache `1` permanently. Binding post-register
 * dodges that by capturing the purchasable reference directly.
 *
 * Effect math: `(1 + perLevel)^amount`. At level 0 the purchasable is
 * unbought, so the binding's `active` predicate (`purchasable.bought`)
 * gates it off; level N contributes `(1 + perLevel)^N`. Reading
 * `p.amount.value` inside the multiplier keeps the computed reactively
 * tracking new purchases without re-binding.
 *
 * AI factions get a category registered for symmetry but the demo never
 * purchases from them — PLAYER_FACTION drives the economy this round.
 * TODO(expansion): drive AI essence spend via a goal-weight-aware auto-buy
 * policy so non-player factions scale their own chains instead of staying
 * pinned at level 0.
 */

import {
  createCostRequirement,
  createMultiplicativeModifier,
  createPurchasableCategory,
  Decimal,
  withPersistentContext,
  type DecimalSource,
  type ModifierChain,
  type Purchasable,
  type PurchasableCategory,
  type Resource,
} from 'open-loop-engine';
import {
  FACTION_IDS,
  UPGRADE_DEFS,
  type FactionId,
  type UpgradeDef,
  type UpgradeTarget,
} from './content';

export interface UpgradeChains {
  yield: Record<FactionId, ModifierChain>;
  spread: Record<FactionId, ModifierChain>;
  attack: Record<FactionId, ModifierChain>;
  defense: Record<FactionId, ModifierChain>;
}

export interface UpgradeSystem {
  /** One purchasable category per faction, same {@link UPGRADE_DEFS} shape. */
  readonly categoriesByFaction: Record<FactionId, PurchasableCategory<UpgradeDef>>;
  /** Shortcut: resolve a faction's purchasable by target. */
  get(faction: FactionId, target: UpgradeTarget): Purchasable | undefined;
}

export interface UpgradeSystemOptions {
  essence: Record<FactionId, Resource<DecimalSource>>;
  chains: UpgradeChains;
  /** Max level per essence-tier upgrade row; defaults to Director's `balance.essenceUpgradeMaxLevel`. */
  maxLevel: DecimalSource;
}

function chainFor(chains: UpgradeChains, faction: FactionId, target: UpgradeTarget): ModifierChain {
  return chains[target][faction];
}

export function createUpgradeSystem(opts: UpgradeSystemOptions): UpgradeSystem {
  const { essence, chains, maxLevel } = opts;

  const categoriesByFaction = {} as Record<FactionId, PurchasableCategory<UpgradeDef>>;

  for (const faction of FACTION_IDS) {
    const categoryId = `creep-warfare-upgrades-${faction}`;

    // Cost closures still self-reference `category` — the lookup is only
    // invoked when Vue reads `.value` on the cost computed, and by then
    // register() has finished, so the purchasable exists. This is safe where
    // declarative `grants` are not — see module header.
    const category: PurchasableCategory<UpgradeDef> = withPersistentContext(categoryId, () =>
      createPurchasableCategory<UpgradeDef>({
        id: categoryId,
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.description },
          requirements: createCostRequirement({
            resource: essence[faction],
            cost: () => {
              const level = category.getPurchasable(def.id)?.amount.value ?? 0;
              return Decimal.mul(def.baseCost, Decimal.pow(def.costScaling, level));
            },
            description: `${def.name} cost`,
          }),
          limit: maxLevel,
        }),
      }),
    );

    category.register(UPGRADE_DEFS as UpgradeDef[]);

    // Bind chain modifiers now that purchasables exist. Each modifier's
    // `multiplier` closure captures the purchasable directly — first
    // evaluation reads `p.amount.value` and establishes the reactive dep, so
    // subsequent `.purchase()` calls invalidate the computed cleanly.
    for (const def of UPGRADE_DEFS) {
      const p = category.getPurchasable(def.id);
      if (p == null) {
        throw new Error(`upgrades: '${def.id}' missing from category '${categoryId}'`);
      }
      withPersistentContext(categoryId, () =>
        chainFor(chains, faction, def.id).bind({
          active: p.bought,
          modifier: createMultiplicativeModifier({
            multiplier: () => Decimal.pow(Decimal.add(1, def.perLevel), p.amount.value),
            description: def.name,
          }),
        }),
      );
    }

    categoriesByFaction[faction] = category;
  }

  return {
    categoriesByFaction,
    get(faction, target) {
      return categoriesByFaction[faction].getPurchasable(target);
    },
  };
}
