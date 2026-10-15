import {
  computed,
  createBooleanRequirement,
  createCostRequirement,
  createGateRequirement,
  createModifierChain,
  createMultiplicativeModifier,
  createPurchasableCategory,
  createResource,
  Decimal,
  Formula,
  toNumber,
  tunable,
  watch,
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
  CALIBRATION_RATIO,
  CALIBRATION_STEP,
  CARRIERS,
  PIECES,
  PIECE_COST0,
  PRICE_RATIO,
  PULSE_COST0,
  REFIT_MULT,
  SHIPS,
  calibrationCost0,
  carrierBefore,
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
import { FleetKey } from './fleet';
import { PackerTuningRegistryKey } from './tuning';

/**
 * Yard module — what salvage buys on the ship in service: the fabricator's ladder for each
 * module type, the hull sections that plate the lattice, and the refits that land on the
 * firepower chain. Its persistent context is what a recommission clears. It reads the
 * fleet, and nothing of the board's.
 */

export interface YardApi {
  salvage: Resource;
  /** one escalating ladder per module type; its count is every copy fabricated this ship */
  fabricator: PurchasableCategory<PieceDef>;
  /** every ship's sections; only the ship in service's are shown, plated in authored order */
  hull: PurchasableCategory<SectionDef>;
  refits: PurchasableCategory<RefitDef>;
  /** the repeatable firepower refit, once the breach line is open: the salvage sink */
  calibration: PurchasableCategory<{ id: string }>;
  /** the global stack every weapon passes through: the refits and the honours */
  firepowerChain: ModifierChain;
  /** product of every term on the firepower chain */
  globalMult: ComputedRef<number>;
  /** copies of a type fabricated this ship, fitted or not */
  owned(type: PieceId): number;
  /** whether a type's schematic has been recovered, on any ship */
  unlocked(type: PieceId): boolean;
  /** salvage earned by the ship in service, its purse or grant included: what its gates read */
  shipEarned(): number;
  /** whether a hull section of the ship in service is plated; section 0 is the core */
  plated(section: number): boolean;
}

export const YardKey: InjectionKey<YardApi> = Symbol('packer/yard') as InjectionKey<YardApi>;

/** The yard's persistent context: what a recommission clears. */
export const YARD_CONTEXT = 'packer/yard';

let api: YardApi;

export function getYard(): YardApi {
  return api;
}

/** A refit's beat id: `frigate:fire-control` is scheduled as `frigate:refit:fire-control`. */
export const refitBeat = (def: RefitDef) => def.id.replace(':', ':refit:');

export function createYardModule(): EngineModule {
  return {
    id: YARD_CONTEXT,
    dependencies: ['packer/fleet'],
    install(ctx) {
      const registry = ctx.inject(PackerTuningRegistryKey);
      const fleet = ctx.inject(FleetKey);

      // The starting purse buys the first cannon; it counts toward cumulative salvage.
      const salvage = createResource<DecimalSource>(PULSE_COST0, {
        id: 'salvage',
        displayName: 'Salvage',
      });
      const firepowerChain = createModifierChain('firepower');
      firepowerChain.bind({
        text: 'Honours',
        modifier: createMultiplicativeModifier({
          multiplier: () => fleet.honourMult.value,
          description: 'Honours',
        }),
      });
      // The recommission names `cumulative` in its reset, so it counts this ship's salvage:
      // its purse or grant included.
      const cumulative = () => toNumber(salvage.cumulative!.value);

      // ── Fabricator: one escalating ladder per module type ──
      // A schematic decrypts on its own ship once lifetime salvage passes its gate, and
      // stays decrypted on every ship after.
      const shipOf = (beat: string) => beat.slice(0, beat.indexOf(':'));
      const reached = (def: PieceDef) =>
        !def.unlock ||
        fleet.decrypted.value.includes(def.id) ||
        (shipOf(def.unlock) === fleet.ship.value && cumulative() >= unlockGate(def.unlock));
      for (const def of PIECES)
        if (def.unlock)
          watch(
            () => reached(def),
            (now) => {
              if (now && !fleet.decrypted.value.includes(def.id))
                fleet.decrypted.value = [...fleet.decrypted.value, def.id];
            },
            // Sync: the schematic must stay decrypted through the reset that clears its gate.
            { immediate: true, flush: 'sync' },
          );
      const priceRatio = tunable(registry, 'pieces/priceRatio', () => PRICE_RATIO);
      const fabricator = createPurchasableCategory<PieceDef>({
        id: 'fabricator',
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.blurb },
          requirements: (level) => [
            createBooleanRequirement({
              met: () => reached(def),
              description: 'Schematic recovered',
            }),
            createCostRequirement({
              resource: salvage,
              cost: Formula.exponential(level, PIECE_COST0[def.id], priceRatio),
            }),
          ],
          visible: () => reached(def),
          purchaseMaxByDefault: false,
        }),
      });
      fabricator.register([...PIECES]);

      // ── Hull sections: one-shot plates of the ship in service, in authored order ──
      // A section the schedule puts after a carrier waits for that carrier's fall.
      const hull: PurchasableCategory<SectionDef> = createPurchasableCategory<SectionDef>({
        id: 'hull',
        mapPurchasable: (def) => {
          const prev = SHIPS.find((s) => s.id === def.ship)!.sections[def.index - 2];
          const carrier = carrierBefore(def.id);
          const gate: Gate | undefined = prev
            ? { kind: 'active', category: 'hull', entry: prev.id }
            : undefined;
          return {
            display: {
              title: def.name,
              description: `Plates ${cellsInSection(def.ship, def.index)} hull cells.`,
            },
            requirements: [
              createBooleanRequirement({ met: () => fleet.ship.value === def.ship }),
              ...(carrier
                ? [
                    createBooleanRequirement({
                      met: () => fleet.authoredFallen.value > CARRIERS.indexOf(carrier),
                      description: `${carrier.name} destroyed`,
                    }),
                  ]
                : []),
              ...(gate
                ? [createGateRequirement({ gate, description: `${prev!.name} plated` })]
                : []),
              createCostRequirement({ resource: salvage, cost: sectionPrice(def.id) }),
            ],
            visible: () =>
              fleet.ship.value === def.ship &&
              (!prev || !!hull.getPurchasable(prev.id)?.active.value),
            limit: 1,
          };
        },
      });
      hull.register(SHIPS.flatMap((s) => s.sections));

      // ── Refits: global terms on the firepower chain, each shown a little before its beat ──
      const refitMult = tunable(registry, 'refits/mult', () => REFIT_MULT);
      const refits = createPurchasableCategory<RefitDef>({
        id: 'refits',
        mapPurchasable: (def) => {
          const beat = refitBeat(def);
          const shown = () => fleet.ship.value === def.ship && cumulative() >= refitGate(beat);
          return {
            display: { title: def.name, description: def.blurb },
            requirements: [
              createBooleanRequirement({ met: shown, description: 'Refit cleared' }),
              createCostRequirement({ resource: salvage, cost: refitPrice(beat) }),
            ],
            visible: shown,
            limit: 1,
            grants: [{ chain: firepowerChain, multiplier: refitMult, description: def.name }],
          };
        },
      });
      refits.register(SHIPS.flatMap((s) => s.refits));

      // ── Calibration: repeatable, once the line is open ──
      const calibrationBase = computed(() => calibrationCost0(fleet.ship.value));
      const calibration = createPurchasableCategory<{ id: string }>({
        id: 'calibration',
        mapPurchasable: () => ({
          display: { title: 'Calibration', description: 'Every weapon hits harder.' },
          requirements: (level) => [
            createBooleanRequirement({ met: () => fleet.lineOpen.value }),
            createCostRequirement({
              resource: salvage,
              cost: Formula.exponential(level, calibrationBase, CALIBRATION_RATIO),
            }),
          ],
          visible: () => fleet.lineOpen.value,
          purchaseMaxByDefault: false,
        }),
      });
      calibration.register([{ id: 'calibration' }]);
      const calibrated = calibration.getPurchasable('calibration')!;
      firepowerChain.bind({
        text: 'Calibration',
        modifier: createMultiplicativeModifier({
          multiplier: () => Math.pow(CALIBRATION_STEP, toNumber(calibrated.count.value)),
          description: 'Calibration',
        }),
      });

      api = {
        salvage,
        fabricator,
        hull,
        refits,
        calibration,
        firepowerChain,
        globalMult: computed(() => toNumber(Decimal.fromValue(firepowerChain.apply(1)))),
        shipEarned: cumulative,
        owned: (type) => toNumber(fabricator.getPurchasable(type)!.count.value),
        unlocked: (type) => reached(PIECES.find((p) => p.id === type)!),
        plated: (section) =>
          section === 0 ||
          (section > 0 &&
            !!hull.getPurchasable(`${fleet.ship.value}:section-${section}`)?.active.value),
      };
      ctx.provide(YardKey, api);
    },
  };
}
