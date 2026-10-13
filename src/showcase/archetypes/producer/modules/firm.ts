import {
  Decimal,
  computed,
  createAchievementCategory,
  createCostRequirement,
  createModifierChain,
  createProducerCategory,
  createPurchasableCategory,
  createResource,
  persistent,
  shallowRef,
  tunable,
  withPersistentContext,
  type AchievementCategory,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Persistent,
  type ProducerCategory,
  type PurchasableCategory,
  type Resource,
  type ShallowRef,
} from '@open-loop/engine';
import {
  CASH,
  COST_RATIO,
  DEAL_YIELD,
  GRADE_DEFS,
  MANAGEMENT,
  MANAGEMENT_DEFS,
  MILESTONE_DEFS,
  SUBSIDIARIES,
  SUBSIDIARY_DEFS,
  type GradeDef,
  type ManagementDef,
  type MilestoneDef,
  type SubsidiaryDef,
} from '../data';
import { ProducerTuningRegistryKey, type ProducerTunableKey } from './tuning';

/**
 * The firm: cash, the deal button, the subsidiary ladder, the management board,
 * market-leader milestones and credit grades. Everything that earns or
 * multiplies; the desks that spend for the player are `./automation.ts`.
 */

export type LedgerKind = 'acquire' | 'manage' | 'hire' | 'milestone' | 'grade' | 'away';

/** One line on the adding-machine tape. */
export interface LedgerLine {
  seq: number;
  /** Sim seconds since the firm was founded. */
  at: number;
  kind: LedgerKind;
  text: string;
  amount?: number;
}

export interface FirmApi {
  cash: Resource;
  /** Sim seconds since founding. */
  elapsed: Persistent<number>;
  /** Close one deal by hand. */
  deal(): void;
  /** What one deal pays now. */
  dealValue: ComputedRef<Decimal>;
  /** What the subsidiaries earn per second, the deal excluded. */
  incomeRate: ComputedRef<Decimal>;
  subsidiaries: ProducerCategory<SubsidiaryDef>;
  management: PurchasableCategory<ManagementDef>;
  milestones: AchievementCategory<MilestoneDef>;
  grades: AchievementCategory<GradeDef>;
  /** The global stack every subsidiary reads: credit grades. */
  operations: ModifierChain;
  /** The deal's own stack: sales training only. */
  dealChain: ModifierChain;
  /** The most recent tape lines, newest first. */
  ledger: ShallowRef<LedgerLine[]>;
  /** Type a line on the tape. */
  post(kind: LedgerKind, text: string, amount?: number): void;
}

export const FirmKey: InjectionKey<FirmApi> = Symbol('producer/firm') as InjectionKey<FirmApi>;

let api: FirmApi;

export function getFirm(): FirmApi {
  return api;
}

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

      const { cash, elapsed } = withPersistentContext('firm', () => ({
        cash: createResource(Decimal.dZero, { id: CASH, displayName: 'Cash' }),
        elapsed: persistent<number>(0, { id: 'elapsed' }),
      }));
      ctx.onTick((dt) => {
        elapsed.value += dt;
      });

      let seq = 0;
      const ledger = shallowRef<LedgerLine[]>([]);
      const post = (kind: LedgerKind, text: string, amount?: number) => {
        const line = { seq: seq++, at: elapsed.value, kind, text, amount };
        ledger.value = [line, ...ledger.value].slice(0, LEDGER_LENGTH);
      };

      // ─── The deal: manual-action, on its own isolated chain ───
      const dealChain = createModifierChain('deal');
      const deals = createProducerCategory<{ id: string }>({
        id: 'deals',
        registerTick: ctx.onTick,
        mapProducer: () => ({ resource: cash, baseRate: DEAL_YIELD, trigger: 'manual' }),
        mapState: (_def, producer) => {
          producer.rateChain.bind({ modifier: dealChain, text: 'Training' });
        },
      });
      deals.register({ id: 'deal' });
      const dealProducer = deals.getProducer('deal')!;
      const deal = () => dealProducer.activate!();
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
          producer.repeatable!.on('purchased', (bought) => {
            const n = Decimal.fromValue(bought).toNumber();
            const count = Decimal.fromValue(producer.ownedCount.value).toNumber();
            const m = Decimal.fromValue(costRatio.value).toNumber();
            // What the n units just bought cost: a·m^(c−n)·(m^n − 1)/(m − 1).
            const paid = def.baseCost * m ** (count - n) * ((m ** n - 1) / (m - 1));
            post(
              'acquire',
              n > 1 ? `${n} ${def.unit}s → ${count}` : `${def.unit} #${count}`,
              -paid,
            );
          });
        },
      });
      subsidiaries.register(SUBSIDIARY_DEFS);
      const incomeRate = computed(() => Decimal.fromValue(subsidiaries.getTotalRate(cash)));

      const chainFor = (target: ManagementDef['target']) =>
        target.kind === 'deal' ? dealChain : subsidiaries.getProducer(target.id)!.rateChain;

      // ─── Management board: bought one-shots on the stack ───
      const management = createPurchasableCategory<ManagementDef>({
        id: MANAGEMENT,
        mapPurchasable: (def) => ({
          display: { title: def.title, description: def.description },
          requirements: createCostRequirement({ resource: cash, cost: def.cost }),
          limit: 1,
          visible: def.visible,
          grants: [{ chain: chainFor(def.target), multiplier: def.mult, description: def.title }],
        }),
        mapState: (def, p) => {
          p.on('purchased', () => post('manage', def.title, -def.cost));
        },
      });
      management.register(MANAGEMENT_DEFS);

      // ─── Statistics thresholds stepping the stack ───
      const milestones = createAchievementCategory<MilestoneDef>({
        id: 'milestones',
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
          onComplete: () => post('milestone', `market leader · ${def.title.toLowerCase()}`),
        }),
      });
      milestones.register(MILESTONE_DEFS);

      const grades = createAchievementCategory<GradeDef>({
        id: 'grades',
        mapAchievement: (def) => ({
          display: { title: def.grade, effectDescription: `×${def.mult} all subsidiaries` },
          goal: def.requirement,
          grants: [
            { chain: operations, multiplier: def.mult, description: `Credit grade ${def.grade}` },
          ],
          onComplete: () => post('grade', `credit upgraded to ${def.grade}`),
        }),
      });
      grades.register(GRADE_DEFS);

      api = {
        cash,
        elapsed,
        deal,
        dealValue,
        incomeRate,
        subsidiaries,
        management,
        milestones,
        grades,
        operations,
        dealChain,
        ledger,
        post,
      };
      ctx.provide(FirmKey, api);
    },
  };
}
