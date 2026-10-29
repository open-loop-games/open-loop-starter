import {
  Decimal,
  computed,
  createAchievementCategory,
  createAdditiveModifier,
  createCostRequirement,
  createModifierChain,
  createProducerCategory,
  createPurchasableCategory,
  createResource,
  persistent,
  tunable,
  withPersistentContext,
  type AchievementCategory,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Persistent,
  type Purchasable,
  type ProducerCategory,
  type PurchasableCategory,
  type Resource,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { createEventLog, type EventLog } from '@/modules/event-log';
import {
  CASH,
  COST_RATIO,
  DEAL_YIELD,
  ENDING_DEF,
  GRADE_DEFS,
  GRADES_CATEGORY,
  MANAGEMENT,
  MANAGEMENT_DEFS,
  MILESTONES,
  MILESTONE_DEFS,
  SUBSIDIARIES,
  SUBSIDIARY_DEFS,
  SYNERGY_CHEAP,
  SYNERGY_COSTLY,
  referralPerSubsidiary,
  type EndingDef,
  type GradeDef,
  type ManagementDef,
  type MilestoneDef,
  type SubsidiaryDef,
} from '../data';
import { ProducerTuningRegistryKey, type ProducerTunableKey } from './tuning';

/**
 * The firm: cash, the deal button, the subsidiary ladder, the management board
 * (memos, synergies, the referral network), market-leader certificates, credit
 * grades and the ending. Everything that earns or multiplies by the firm's own
 * holdings; the desks and their phones are `./automation.ts`.
 */

export type LedgerKind = 'acquire' | 'manage' | 'hire' | 'milestone' | 'grade' | 'tip' | 'away';

/** What a tape line carries beside its text: the cash it moved. */
export interface LedgerExtra {
  amount: number;
}

export interface FirmApi {
  cash: Resource;
  /** Sim seconds since founding. */
  elapsed: Persistent<number>;
  /** Close one deal by hand. */
  deal(): void;
  /** What one deal by hand pays now. */
  dealValue: ComputedRef<Decimal>;
  /** Deals closed by hand, ever. */
  handDeals: Persistent<number>;
  /** Units owned across every subsidiary. */
  holdings: ComputedRef<number>;
  /** What the subsidiaries earn per second, the deal excluded. */
  incomeRate: ComputedRef<Decimal>;
  subsidiaries: ProducerCategory<SubsidiaryDef>;
  management: PurchasableCategory<ManagementDef>;
  milestones: AchievementCategory<MilestoneDef>;
  grades: AchievementCategory<GradeDef>;
  /** The global stack every subsidiary reads: credit grades. */
  operations: ModifierChain;
  /** Every deal's stack, by hand or by phone: the referral network, then sales training. */
  dealChain: ModifierChain;
  /** Deals by hand only: the closing spree. */
  handChain: ModifierChain;
  /** The Consolidated Building; bought, the firm's story ends and play goes on. */
  ending: Purchasable;
  /** The adding-machine tape, stamped in sim seconds since founding; a session log. */
  ledger: EventLog<LedgerKind, LedgerExtra>;
}

export const FirmKey: InjectionKey<FirmApi> = Symbol('producer/firm') as InjectionKey<FirmApi>;

const firmApi = createModuleApi(FirmKey);

/** The firm's books and ladder. Read it after the engine starts. */
export const getFirm = firmApi.get;

const LEDGER_LENGTH = 60;

export function createFirmModule(): EngineModule {
  return {
    id: 'producer/firm',
    dependencies: ['producer/tuning'],
    install(ctx) {
      const tuning = ctx.inject(ProducerTuningRegistryKey);
      const costRatio = tunable(
        tuning,
        'balance/costRatio' satisfies ProducerTunableKey,
        () => COST_RATIO,
      );

      const { cash, elapsed, handDeals } = withPersistentContext('firm', () => ({
        cash: createResource(Decimal.dZero, { id: CASH, displayName: 'Cash' }),
        elapsed: persistent<number>(0, { id: 'elapsed' }),
        handDeals: persistent<number>(0, { id: 'hand-deals' }),
      }));
      ctx.onTick((dt) => {
        elapsed.value += dt;
      });

      const ledger = createEventLog<LedgerKind, LedgerExtra>(ctx, {
        cap: LEDGER_LENGTH,
        clock: () => elapsed.value,
      });

      // ─── The deal: manual-action. The referral network adds before training
      // multiplies, so the deal chain holds both, in that order. ───
      const dealChain = createModifierChain('deal');
      const handChain = createModifierChain('hand');
      const deals = createProducerCategory<{ id: string }>({
        id: 'deals',
        registerTick: ctx.onTick,
        mapProducer: () => ({ resource: cash, baseRate: DEAL_YIELD, trigger: 'manual' }),
        mapState: (_def, producer) => {
          producer.rateChain.bind({ modifier: dealChain, text: 'Deal' });
          producer.rateChain.bind({ modifier: handChain, text: 'By hand' });
        },
      });
      deals.register({ id: 'deal' });
      const dealProducer = deals.getProducer('deal')!;
      const deal = () => {
        handDeals.value += 1;
        dealProducer.activate!();
      };
      const dealValue = computed(() => Decimal.fromValue(dealProducer.computedRate.value));

      // ─── Subsidiaries: producer + escalating-price ───
      const operations = createModifierChain('operations');
      const subsidiaries = createProducerCategory<SubsidiaryDef>({
        id: SUBSIDIARIES,
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: cash,
          baseRate: def.baseRate,
          trigger: 'continuous',
          display: def.displayName,
          purchase: {
            costResource: cash,
            baseCost: tunable(
              tuning,
              `subsidiaries/${def.id}/baseCost` satisfies ProducerTunableKey,
              () => def.baseCost,
            ),
            costRatio,
            visible: def.visible,
          },
        }),
        mapState: (def, producer) => {
          producer.rateChain.bind({ modifier: operations, text: 'Operations' });
          producer.purchasable!.on('purchased', (bought) => {
            const n = Decimal.fromValue(bought).toNumber();
            const count = Decimal.fromValue(producer.ownedCount.value).toNumber();
            const m = Decimal.fromValue(costRatio.value).toNumber();
            // What the n units just bought cost: a·m^(c−n)·(m^n − 1)/(m − 1).
            const paid = def.baseCost * m ** (count - n) * ((m ** n - 1) / (m - 1));
            ledger.post(
              n > 1 ? `${n} ${def.unit}s → ${count}` : `${def.unit} #${count}`,
              'acquire',
              { amount: -paid },
            );
          });
        },
      });
      subsidiaries.register(SUBSIDIARY_DEFS);
      const incomeRate = computed(() => Decimal.fromValue(subsidiaries.getTotalRate(cash)));
      const owned = (id: string) =>
        Decimal.fromValue(subsidiaries.getProducer(id)!.ownedCount.value).toNumber();
      const holdings = computed(() => SUBSIDIARY_DEFS.reduce((n, d) => n + owned(d.id), 0));
      const rateChainOf = (id: string) => subsidiaries.getProducer(id)!.rateChain;

      const grantsFor = (def: ManagementDef) => {
        const t = def.target;
        switch (t.kind) {
          case 'deal':
            return [{ chain: dealChain, multiplier: def.mult, description: def.title }];
          case 'subsidiary':
            return [{ chain: rateChainOf(t.id), multiplier: def.mult, description: def.title }];
          case 'synergy':
            return [
              {
                chain: rateChainOf(t.cheap),
                multiplier: () => 1 + SYNERGY_CHEAP * owned(t.costly),
                description: def.title,
              },
              {
                chain: rateChainOf(t.costly),
                multiplier: () => 1 + SYNERGY_COSTLY * owned(t.cheap),
                description: def.title,
              },
            ];
          case 'referral':
            // The network's add is one modifier on the deal chain, below.
            return [];
        }
      };

      // The referral network's place in the deal chain, ahead of training's memos.
      const referralSlot = dealChain.reserve();

      // ─── Management board: bought one-shots on the stack ───
      const management = createPurchasableCategory<ManagementDef>({
        id: MANAGEMENT,
        mapPurchasable: (def) => ({
          display: { title: def.title, description: def.description },
          requirements: createCostRequirement({ resource: cash, cost: def.cost }),
          limit: 1,
          visible: def.visible,
          grants: grantsFor(def),
        }),
        mapState: (def, p) => {
          p.on('purchased', () => ledger.post(def.title, 'manage', { amount: -def.cost }));
        },
      });
      management.register(MANAGEMENT_DEFS);

      // The referral network: every deal pays its add per subsidiary owned. It
      // goes ahead of training in the deal chain, so training multiplies it.
      const networks = computed(
        () =>
          management
            .getAll()
            .filter((e) => e.def.target.kind === 'referral' && e.purchasable.active.value).length,
      );
      referralSlot.add(
        createAdditiveModifier({
          addend: () => referralPerSubsidiary(networks.value) * holdings.value,
          description: 'Referral network',
        }),
      );

      // ─── Statistics thresholds stepping the stack ───
      const milestones = createAchievementCategory<MilestoneDef>({
        id: MILESTONES,
        mapAchievement: (def) => ({
          display: { title: def.title, effectDescription: `×${def.mult}` },
          goal: def.requirement,
          grants: [
            {
              chain: subsidiaries.getProducer(def.subsidiary)!.rateChain,
              multiplier: def.mult,
              description: `Market leader (${def.count})`,
            },
          ],
          onComplete: () => ledger.post(`market leader · ${def.title.toLowerCase()}`, 'milestone'),
        }),
      });
      milestones.register(MILESTONE_DEFS);

      const grades = createAchievementCategory<GradeDef>({
        id: GRADES_CATEGORY,
        mapAchievement: (def) => ({
          display: { title: def.grade, effectDescription: `×${def.mult} all subsidiaries` },
          goal: def.requirement,
          grants: [
            { chain: operations, multiplier: def.mult, description: `Credit grade ${def.grade}` },
          ],
          onComplete: () => ledger.post(`credit upgraded to ${def.grade}`, 'grade'),
        }),
      });
      grades.register(GRADE_DEFS);

      // ─── The ending ───
      const landmarks = createPurchasableCategory<EndingDef>({
        id: 'landmarks',
        mapPurchasable: (def) => ({
          display: { title: def.title, description: def.description },
          requirements: createCostRequirement({ resource: cash, cost: def.cost }),
          limit: 1,
          visible: def.visible,
        }),
        mapState: (def, p) => {
          p.on('purchased', () =>
            ledger.post(`bought ${def.title}`, 'manage', { amount: -def.cost }),
          );
        },
      });
      landmarks.register(ENDING_DEF);
      const ending = landmarks.getPurchasable(ENDING_DEF.id)!;

      firmApi.publish(ctx, {
        cash,
        elapsed,
        deal,
        dealValue,
        handDeals,
        holdings,
        incomeRate,
        subsidiaries,
        management,
        milestones,
        grades,
        operations,
        dealChain,
        handChain,
        ending,
        ledger,
      });
    },
  };
}
