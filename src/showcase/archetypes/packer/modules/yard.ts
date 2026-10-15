import {
  computed,
  createCostRequirement,
  createGateRequirement,
  createModifierChain,
  createPurchasableCategory,
  createResource,
  Decimal,
  Formula,
  toNumber,
  tunable,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type Gate,
  type InjectionKey,
  type ModifierChain,
  type PurchasableCategory,
  type Resource,
} from '@open-loop/engine';
import {
  PIECES,
  PIECE_COST0,
  PRICE_RATIO,
  PULSE_COST0,
  REFITS,
  REFIT_MULT,
  SECTIONS,
  cellsInSection,
  refitGate,
  refitPrice,
  sectionPrice,
  unlockGate,
  type PieceDef,
  type PieceId,
  type RefitDef,
  type SectionDef,
} from '../data';
import { PackerTuningRegistryKey } from './tuning';

/**
 * Yard module — what salvage buys: the fabricator's ladder for each module type, the hull
 * sections that plate the lattice, and the refits that land on the firepower chain. It
 * reads nothing of the board's.
 */

export interface YardApi {
  salvage: Resource;
  /** one escalating ladder per module type; its count is every copy ever fabricated */
  fabricator: PurchasableCategory<PieceDef>;
  /** the hull's sections, plated in authored order */
  hull: PurchasableCategory<SectionDef>;
  refits: PurchasableCategory<RefitDef>;
  /** the global stack every weapon's salvage passes through; the refits grant into it */
  firepowerChain: ModifierChain;
  /** product of every term on the firepower chain */
  globalMult: ComputedRef<number>;
  /** copies of a type ever fabricated, fitted or not */
  owned(type: PieceId): number;
  /** whether a type's schematic has been recovered */
  unlocked(type: PieceId): boolean;
  /** whether a hull section is plated; section 0 is the corvette core, always open */
  plated(section: number): boolean;
}

export const YardKey: InjectionKey<YardApi> = Symbol('packer/yard') as InjectionKey<YardApi>;

let api: YardApi;

export function getYard(): YardApi {
  return api;
}

export function createYardModule(): EngineModule {
  return {
    id: 'packer/yard',
    install(ctx) {
      const registry = ctx.inject(PackerTuningRegistryKey);

      // The starting purse buys the first cannon; it counts toward cumulative salvage.
      const salvage = createResource<DecimalSource>(PULSE_COST0, {
        id: 'salvage',
        displayName: 'Salvage',
      });
      const firepowerChain = createModifierChain('firepower');

      const salvageGate = (value: number): Gate => ({
        kind: 'cumulative-gte',
        resource: 'salvage',
        value,
      });

      // ── Fabricator: one escalating ladder per module type ──
      const priceRatio = tunable(registry, 'pieces/priceRatio', () => PRICE_RATIO);
      const fabricator = createPurchasableCategory<PieceDef>({
        id: 'fabricator',
        mapPurchasable: (def) => {
          const gate = def.unlock ? salvageGate(unlockGate(def.unlock)) : undefined;
          return {
            display: { title: def.name, description: def.blurb },
            requirements: (level) => [
              ...(gate
                ? [createGateRequirement({ gate, description: 'Schematic recovered' })]
                : []),
              createCostRequirement({
                resource: salvage,
                cost: Formula.exponential(level, PIECE_COST0[def.id], priceRatio),
              }),
            ],
            visible: gate ?? true,
            purchaseMaxByDefault: false,
          };
        },
      });
      fabricator.register([...PIECES]);

      // ── Hull sections: one-shot plates, opened in authored order ──
      const hull = createPurchasableCategory<SectionDef>({
        id: 'hull',
        mapPurchasable: (def) => {
          const prev = SECTIONS.find((s) => s.index === def.index - 1);
          const gate: Gate | undefined = prev
            ? { kind: 'active', category: 'hull', entry: prev.id }
            : undefined;
          return {
            display: {
              title: def.name,
              description: `Plates ${cellsInSection(def.index)} hull cells.`,
            },
            requirements: [
              ...(gate
                ? [createGateRequirement({ gate, description: `${prev!.name} plated` })]
                : []),
              createCostRequirement({ resource: salvage, cost: sectionPrice(def.beat) }),
            ],
            visible: gate ?? true,
            limit: 1,
          };
        },
      });
      hull.register([...SECTIONS]);

      // ── Refits: global terms on the firepower chain ──
      const refitMult = tunable(registry, 'refits/mult', () => REFIT_MULT);
      const refits = createPurchasableCategory<RefitDef>({
        id: 'refits',
        mapPurchasable: (def) => {
          const gate = salvageGate(refitGate(def.beat));
          return {
            display: { title: def.name, description: def.blurb },
            requirements: [
              createGateRequirement({ gate, description: 'Refit cleared' }),
              createCostRequirement({ resource: salvage, cost: refitPrice(def.beat) }),
            ],
            visible: gate,
            limit: 1,
            grants: [{ chain: firepowerChain, multiplier: refitMult, description: def.name }],
          };
        },
      });
      refits.register([...REFITS]);

      api = {
        salvage,
        fabricator,
        hull,
        refits,
        firepowerChain,
        globalMult: computed(() => toNumber(Decimal.fromValue(firepowerChain.apply(1)))),
        owned: (type) => toNumber(fabricator.getPurchasable(type)!.count.value),
        unlocked: (type) => fabricator.getPurchasable(type)!.visible.value,
        plated: (section) =>
          section === 0 ||
          (section > 0 && !!hull.getPurchasable(`section-${section}`)?.active.value),
      };
      ctx.provide(YardKey, api);
    },
  };
}
