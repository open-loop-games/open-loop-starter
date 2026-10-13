import {
  Decimal,
  Formula,
  addResource,
  computed,
  createAchievementCategory,
  createCostRequirement,
  createModifierChain,
  createPurchasableCategory,
  createResource,
  tunable,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Purchasable,
  type Resource,
} from '@open-loop/engine';
import {
  ANCHORS,
  BOX_FRAGMENTS,
  BOX_PAGES,
  CLERK_BASE_COST,
  CLERK_PAGES_PER_S,
  IDS,
  NOTES_PER_PAGE,
} from '../data';
import { CaseKey } from './case';
import { drawConvert } from './convert';
import { PhaseShifterTuningRegistryKey } from './tuning';

/**
 * Box module — Phase I. One verb (read a page), one hire (a clerk who reads
 * for you), and a finite stock of pages. Emptying the box is the record that
 * opens the first door; the notes it paid out are what Phase II burns, and the
 * clerks stay on into the phases after.
 */
export interface BoxApi {
  pages: Resource;
  pagesRead: Resource;
  notes: Resource;
  clerk: Purchasable;
  clerks: ComputedRef<Decimal>;
  /** Pages/s the clerks read together, after the chain: 0 once retired. */
  clerkReadRate: ComputedRef<Decimal>;
  clerkReadChain: ModifierChain;
  /** The hand verb. False when retired or the box is empty. */
  read(): boolean;
}

export const BoxKey: InjectionKey<BoxApi> = Symbol('phase-shifter/box') as InjectionKey<BoxApi>;

let api: BoxApi;

export function getBox(): BoxApi {
  return api;
}

export function createBoxModule(): EngineModule {
  return {
    id: 'phase-shifter/box',
    install(ctx) {
      const registry = ctx.inject(PhaseShifterTuningRegistryKey);
      const { life, write } = ctx.inject(CaseKey);
      const boxPages = tunable(registry, 'box/pages', () => BOX_PAGES);
      const notesPerPage = tunable(registry, 'box/notesPerPage', () => NOTES_PER_PAGE);
      const clerkPagesPerS = tunable(registry, 'box/clerk/pagesPerS', () => CLERK_PAGES_PER_S);
      const clerkBaseCost = tunable(registry, 'box/clerk/baseCost', () => CLERK_BASE_COST);
      const growth = tunable(registry, 'ladders/growth', () => ANCHORS.growth);

      const pages = createResource<Decimal>(new Decimal(boxPages.value), {
        id: 'pages',
        displayName: 'pages',
      });
      const pagesRead = createResource<Decimal>(Decimal.dZero, {
        id: IDS.pagesRead,
        displayName: 'pages read',
      });
      const notes = createResource<Decimal>(Decimal.dZero, { id: 'notes', displayName: 'notes' });

      /** The act both the reading verb and the clerks perform. */
      function readPages(amount: DecimalSource): Decimal {
        const read = drawConvert(pages, notes, amount, notesPerPage.value);
        if (read.gt(0)) addResource(pagesRead, read);
        return read;
      }

      const staff = createPurchasableCategory<{ id: 'clerk' }>({
        id: 'staff',
        mapPurchasable: () => ({
          display: {
            title: 'Hire a clerk',
            description: 'Reads a page a second. Stays on through whatever comes next.',
          },
          requirements: (level) =>
            createCostRequirement({
              resource: notes,
              cost: Formula.exponential(level, clerkBaseCost, growth),
              maxBulkCount: 1,
            }),
          visible: life.liveGate('clerk-hire'),
        }),
      });
      staff.register({ id: 'clerk' });
      const clerk = staff.getPurchasable('clerk')!;
      const clerks = computed(() => new Decimal(clerk.count.value));

      const clerkReadChain = createModifierChain('clerk-read');
      life.scope('clerk-read', [clerkReadChain]);
      const clerkReadRate = computed(() =>
        new Decimal(clerkReadChain.apply(clerkPagesPerS.value)).mul(clerks.value),
      );

      // The clerks perform the reading verb's own act on the tick.
      ctx.onTick((dt) => {
        if (clerkReadRate.value.gt(0)) readPages(clerkReadRate.value.mul(dt));
      });

      const evidence = createAchievementCategory<{ id: string; at: number; text: string }>({
        id: 'evidence',
        mapAchievement: (def) => ({
          display: { title: def.text },
          goal: { kind: 'cumulative-gte', resource: IDS.pagesRead, value: def.at },
          showPopup: false,
          onComplete: () => write(def.text),
        }),
      });
      evidence.register(BOX_FRAGMENTS.map(([at, text], i) => ({ id: `fragment-${i}`, at, text })));

      const readLive = life.isLive('read');
      api = {
        pages,
        pagesRead,
        notes,
        clerk,
        clerks,
        clerkReadRate,
        clerkReadChain,
        read() {
          if (!readLive.value) return false;
          return readPages(1).gt(0);
        },
      };
      ctx.provide(BoxKey, api);
    },
  };
}
