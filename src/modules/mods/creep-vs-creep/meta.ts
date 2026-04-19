/**
 * Meta-currency upgrade tree (OL-511).
 *
 * One shared {@link PurchasableCategory} — not per-faction, unlike OL-510's
 * essence trees. All chain upgrades here bind into {@link PLAYER_FACTION}'s
 * chains only (single-player demo). The `slot-capacity` entry is a ref-level
 * ratchet and does not bind a chain.
 *
 * Binding follows the post-register shape from `upgrades.ts`: declarative
 * grants close over `category.getPurchasable` at build time before register
 * has populated the category, so we register first and `chain.bind` after.
 * See that file's module comment for the underlying reason.
 *
 * The `amount` ref on each purchasable lives under
 * `creep-warfare-meta-upgrades:{id}` and is implicitly retained across round
 * resets — the round-reset scope does not include this context (round.ts).
 */

import {
  Decimal,
  createCostRequirement,
  createMultiplicativeModifier,
  createPurchasableCategory,
  withPersistentContext,
  type DecimalSource,
  type ModifierChain,
  type Persistent,
  type Purchasable,
  type PurchasableCategory,
  type Resource,
} from 'open-loop-engine';
import type { DirectorFactionId } from '@/archetypes/director';
import {
  type FactionId,
  type MetaUpgradeDef,
  type MetaUpgradeId,
} from './content';

export interface MetaChains {
  yield: Record<FactionId, ModifierChain>;
  spread: Record<FactionId, ModifierChain>;
  attack: Record<FactionId, ModifierChain>;
  defense: Record<FactionId, ModifierChain>;
}

export interface MetaSystem {
  readonly category: PurchasableCategory<MetaUpgradeDef>;
  /** Lookup a specific meta-upgrade purchasable by id. */
  get(id: MetaUpgradeId): Purchasable | undefined;
}

export interface MetaSystemOptions {
  metaCurrency: Resource<DecimalSource>;
  chains: MetaChains;
  /**
   * Persistent slot-capacity ref. Written directly by the slot-capacity
   * purchasable's `onPurchase` so the ratchet is side-effect-ful rather
   * than chain-bound. Capped at `maxGoalSlots`.
   */
  slotCapacity: Persistent<number>;
  playerFaction: DirectorFactionId;
  maxGoalSlots: number;
  metaUpgradeDefs: readonly MetaUpgradeDef[];
}

function chainFor(
  chains: MetaChains,
  id: MetaUpgradeId,
  playerFaction: DirectorFactionId,
): ModifierChain | null {
  switch (id) {
    case 'yield':
      return chains.yield[playerFaction];
    case 'spread':
      return chains.spread[playerFaction];
    case 'attack':
      return chains.attack[playerFaction];
    case 'defense':
      return chains.defense[playerFaction];
    case 'slot-capacity':
      return null;
  }
}

export function createMetaSystem(opts: MetaSystemOptions): MetaSystem {
  const { metaCurrency, chains, slotCapacity, playerFaction, maxGoalSlots, metaUpgradeDefs } = opts;
  const categoryId = 'creep-warfare-meta-upgrades';

  const category: PurchasableCategory<MetaUpgradeDef> = withPersistentContext(
    categoryId,
    () =>
      createPurchasableCategory<MetaUpgradeDef>({
        id: categoryId,
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.description },
          requirements: createCostRequirement({
            resource: metaCurrency,
            cost: () => {
              const level = category.getPurchasable(def.id)?.amount.value ?? 0;
              return Decimal.mul(def.baseCost, Decimal.pow(def.costScaling, level));
            },
            description: `${def.name} cost`,
          }),
          limit: def.maxLevel,
          onPurchase:
            def.id === 'slot-capacity'
              ? () => {
                  // Ratchet slot capacity one step per purchase, clamped at
                  // maxGoalSlots. The purchasable's own `limit` already
                  // enforces this upstream — the clamp here is a belt-and-
                  // suspenders guard since the ref is shared with
                  // `goals.capacity` and tolerates no out-of-band writes.
                  slotCapacity.value = Math.min(maxGoalSlots, slotCapacity.value + 1);
                }
              : undefined,
        }),
      }),
  );

  category.register([...metaUpgradeDefs]);

  for (const def of metaUpgradeDefs) {
    const chain = chainFor(chains, def.id, playerFaction);
    if (chain == null) continue;
    const p = category.getPurchasable(def.id);
    if (p == null) {
      throw new Error(`meta: '${def.id}' missing from category '${categoryId}'`);
    }
    withPersistentContext(categoryId, () =>
      chain.bind({
        active: p.bought,
        modifier: createMultiplicativeModifier({
          multiplier: () => Decimal.pow(Decimal.add(1, def.perLevel), p.amount.value),
          description: def.name,
        }),
      }),
    );
  }

  return {
    category,
    get(id) {
      return category.getPurchasable(id);
    },
  };
}
