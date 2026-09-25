import {
  Decimal,
  Formula,
  createCostRequirement,
  createPurchasableCategory,
  createResource,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type PurchasableCategory,
} from '@open-loop/engine';
import { computed } from 'vue';
import {
  META_COST_RATIO,
  META_UPGRADES,
  NOTES_PER_KILL,
  type MetaSide,
  type MetaUpgradeDef,
} from '../data/meta';

/**
 * Meta module — the notes that survive a containment failure, and the shop they
 * buy (`../IDENTITY.md` § Cross-Run Meta).
 *
 * A **continuous accumulator**, not a hard-reset prestige: notes carry through
 * every run end including death, which is what makes a failed run still progress
 * and is the property that separates this archetype from prestige-shaped ones.
 *
 * No dependencies, deliberately. Arena reads its multipliers and run awards its
 * notes, so both depend on this and it depends on neither — the alternative is a
 * cycle.
 */

export interface MetaApi {
  /** Banked notes. A `Resource`, so its `cumulative` doubles as the lifetime stat. */
  notes: ReturnType<typeof createResource<Decimal>>;
  shop: PurchasableCategory<MetaUpgradeDef>;
  /** Owned level of one upgrade. */
  levelOf: (id: string) => number;
  /** `∏ perLevel^level` over one side — the `runBaseline` term. */
  baseline: (side: MetaSide) => number;
  /** Live survival / collect / yield multipliers a run opens with. */
  survivalMul: ComputedRef<number>;
  collectMul: ComputedRef<number>;
  yieldMul: ComputedRef<number>;
  /** Bank a finished run's payout. Called by `./run.ts`, win or lose. */
  award: (kills: number, meanYield: number) => void;
}

export const MetaKey: InjectionKey<MetaApi> = Symbol('survivor/meta') as InjectionKey<MetaApi>;

export function createMetaModule(): EngineModule {
  return {
    id: 'survivor/meta',
    install(ctx) {
      const notes = createResource<Decimal>(new Decimal(0), {
        id: 'Notes',
        displayName: 'Notes',
        precision: 0,
      });

      const shop = createPurchasableCategory<MetaUpgradeDef>({
        id: 'survivor/meta-shop',
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.blurb },
          limit: def.maxLevel,
          // Geometric ladder over the tile's own level — the runs-to-buy shape
          // (`../data/meta.ts` § Balance). A Formula prices each rung of a
          // multi-level buy, and `createCostRequirement` does the affordability
          // check and the deduction, so nothing here hand-rolls a wallet.
          requirements: (level) =>
            createCostRequirement({
              resource: notes,
              cost: Formula.exponential(level, def.baseCost, META_COST_RATIO),
            }),
        }),
      });
      shop.register(META_UPGRADES);

      const levelOf = (id: string): number =>
        new Decimal(shop.getEntry(id)?.purchasable.amount.value ?? 0).toNumber();

      const baseline = (side: MetaSide): number =>
        META_UPGRADES.filter((u) => u.side === side && u.effect !== 'revive').reduce(
          (product, u) => product * Math.pow(u.perLevel, levelOf(u.id)),
          1,
        );

      /** One effect's compounded multiplier — used where a side is too coarse. */
      const effectMul = (effect: MetaUpgradeDef['effect']): number => {
        const def = META_UPGRADES.find((u) => u.effect === effect);
        return def ? Math.pow(def.perLevel, levelOf(def.id)) : 1;
      };

      ctx.provide(MetaKey, {
        notes,
        shop,
        levelOf,
        baseline,
        survivalMul: computed(() => baseline('survival')),
        collectMul: computed(() => effectMul('collectRadius')),
        yieldMul: computed(() => effectMul('moteYield')),
        award: (kills, meanYield) => {
          // Payout is the same expression the projection anchors shop costs to,
          // so "one run buys the first tile" stays true rather than drifting.
          const earned = kills * meanYield * NOTES_PER_KILL;
          notes.value = new Decimal(notes.value).add(earned);
        },
      });
    },
  };
}
