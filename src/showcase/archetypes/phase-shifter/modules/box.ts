import {
  Decimal,
  Formula,
  addResource,
  createProducerCategory,
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
import { createModuleApi } from '@/modules/module-api';
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
  /** The verb's last use: the page the box brings back. Closes the case. */
  readLast(): boolean;
}

export const BoxKey: InjectionKey<BoxApi> = Symbol('phase-shifter/box') as InjectionKey<BoxApi>;

const boxApi = createModuleApi(BoxKey);

/** The box, its reading verb and the clerks. Read it after the engine starts. */
export const getBox = boxApi.get;

export function createBoxModule(): EngineModule {
  return {
    id: 'phase-shifter/box',
    install(ctx) {
      const registry = ctx.inject(PhaseShifterTuningRegistryKey);
      const kase = ctx.inject(CaseKey);
      const { life, write } = kase;
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

      /** The reading verb's act; the clerks' converter below reads the same way on the tick. */
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

      // The clerks read on the tick: a converter from pages to pages read, which credits
      // the notes beside its output.
      const reading = createProducerCategory<{ id: 'clerk' }>({
        id: 'reading',
        registerTick: ctx.onTick,
        mapProducer: () => ({
          resource: pagesRead,
          baseRate: () => clerkReadChain.apply(clerkPagesPerS.value),
          trigger: 'continuous',
          extraCount: clerks,
          inputs: { pages: { resource: pages, per: 1 } },
          onProduce: (read) => addResource(notes, Decimal.mul(read, notesPerPage.value)),
        }),
      });
      reading.register({ id: 'clerk' });

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
      const lastLive = life.isLive('last-page');
      const api: BoxApi = {
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
        readLast() {
          if (!lastLive.value || kase.closed.value) return false;
          addResource(pagesRead, 1);
          kase.close();
          return true;
        },
      };
      boxApi.publish(ctx, api);
    },
  };
}
