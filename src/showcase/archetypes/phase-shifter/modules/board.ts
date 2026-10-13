import {
  Decimal,
  computed,
  createBooleanRequirement,
  createConversion,
  createCostRequirement,
  createModifierChain,
  createProducerCategory,
  createPurchasableCategory,
  createResource,
  tunable,
  type ComputedRef,
  type Conversion,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Producer,
  type Purchasable,
  type Resource,
} from '@open-loop/engine';
import {
  ANCHORS,
  CANVASSER_BASE_COST,
  CANVASSER_NOTES_PER_S,
  CLERK_XREF_NOTES_PER_S,
  IDS,
  SECOND_SHIFT_COST,
  TIPLINE_NOTES_PER_S,
} from '../data';
import { BoxKey } from './box';
import { CaseKey } from './case';
import { drawConvert } from './convert';
import { PhaseShifterTuningRegistryKey } from './tuning';

/**
 * Board module — Phase II. Reading is gone; notes arrive by telephone and by
 * canvassers, and become leads by cross-referencing — by hand, or by the
 * clerks hired in Phase I, reassigned. Leads buy canvassers, so the board is a
 * supply-bound converter loop until the clerks' capacity binds.
 */
export interface BoardApi {
  leads: Resource;
  xref: Conversion;
  tipline: Producer;
  canvasser: Producer;
  secondShift: Purchasable;
  clerkXrefChain: ModifierChain;
  /** Notes/s the clerks can cross-reference together: 0 outside Phase II. */
  clerkXrefCapacity: ComputedRef<Decimal>;
  /** Notes/s arriving from the tip line and the canvassers. */
  noteSupply: ComputedRef<Decimal>;
}

export const BoardKey: InjectionKey<BoardApi> = Symbol(
  'phase-shifter/board',
) as InjectionKey<BoardApi>;

let api: BoardApi;

export function getBoard(): BoardApi {
  return api;
}

interface InformantDef {
  id: 'tipline' | 'canvasser';
}

export function createBoardModule(): EngineModule {
  return {
    id: 'phase-shifter/board',
    install(ctx) {
      const registry = ctx.inject(PhaseShifterTuningRegistryKey);
      const { life } = ctx.inject(CaseKey);
      const box = ctx.inject(BoxKey);
      const notesPerLead = tunable(registry, 'board/notesPerLead', () => ANCHORS.notesPerLead);
      const clerkXref = tunable(registry, 'board/clerk/notesPerS', () => CLERK_XREF_NOTES_PER_S);
      const tiplineRate = tunable(registry, 'board/tipline/notesPerS', () => TIPLINE_NOTES_PER_S);
      const canvasserRate = tunable(
        registry,
        'board/canvasser/notesPerS',
        () => CANVASSER_NOTES_PER_S,
      );
      const canvasserBase = tunable(
        registry,
        'board/canvasser/baseCost',
        () => CANVASSER_BASE_COST,
      );
      const growth = tunable(registry, 'ladders/growth', () => ANCHORS.growth);
      const secondShiftCost = tunable(registry, 'board/secondShift/cost', () => SECOND_SHIFT_COST);

      const leads = createResource<Decimal>(Decimal.dZero, { id: IDS.leads, displayName: 'leads' });
      const xrefLive = life.isLive('xref');

      // The hand verb: one cross-reference spends a lead's worth of notes.
      const xref = createConversion({
        inputs: {
          live: createBooleanRequirement({ met: xrefLive, description: 'The board is up' }),
          notes: createCostRequirement({ resource: box.notes, cost: notesPerLead }),
        },
        outputs: { leads: { resource: leads, amount: 1 } },
      });

      const clerkXrefChain = createModifierChain('clerk-xref');
      life.scope('clerk-xref', [clerkXrefChain]);
      const clerkXrefCapacity = computed(() =>
        new Decimal(clerkXrefChain.apply(clerkXref.value)).mul(box.clerks.value),
      );

      // The reassigned clerks perform the cross-reference verb's act on the tick.
      ctx.onTick((dt) => {
        if (clerkXrefCapacity.value.gt(0)) {
          drawConvert(
            box.notes,
            leads,
            clerkXrefCapacity.value.mul(dt),
            Decimal.div(1, notesPerLead.value),
          );
        }
      });

      const informants = createProducerCategory<InformantDef>({
        id: 'informants',
        registerTick: ctx.onTick,
        mapProducer: (def) =>
          def.id === 'tipline'
            ? { resource: box.notes, baseRate: tiplineRate.value, trigger: 'continuous' }
            : {
                resource: box.notes,
                baseRate: canvasserRate.value,
                trigger: 'continuous',
                display: 'Send out a canvasser',
                purchase: {
                  costResource: leads,
                  baseCost: canvasserBase,
                  costRatio: growth,
                  visible: life.liveGate('canvass'),
                },
              },
      });
      informants.register([{ id: 'tipline' }, { id: 'canvasser' }]);
      const tipline = informants.getProducer('tipline')!;
      const canvasser = informants.getProducer('canvasser')!;
      life.scope('tipline', [tipline.rateChain]);
      life.scope('canvass', [canvasser.rateChain]);

      const upgrades = createPurchasableCategory<{ id: 'second-shift' }>({
        id: 'board-upgrades',
        mapPurchasable: () => ({
          display: {
            title: 'Second shift',
            description: 'The clerks stay past midnight. Doubles what they cross-reference.',
          },
          requirements: createCostRequirement({ resource: leads, cost: secondShiftCost }),
          limit: 1,
          visible: life.liveGate('second-shift'),
          grants: [{ chain: clerkXrefChain, multiplier: 2, description: 'Second shift' }],
        }),
      });
      upgrades.register({ id: 'second-shift' });

      api = {
        leads,
        xref,
        tipline,
        canvasser,
        secondShift: upgrades.getPurchasable('second-shift')!,
        clerkXrefChain,
        clerkXrefCapacity,
        noteSupply: computed(() => new Decimal(informants.getTotalRate(box.notes))),
      };
      ctx.provide(BoardKey, api);
    },
  };
}
