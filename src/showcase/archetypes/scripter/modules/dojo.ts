import {
  Decimal,
  computed,
  createCostRequirement,
  createGateRequirement,
  createProducerCategory,
  createPurchasableCategory,
  createResource,
  createScalingPurchasable,
  tunable,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type Gate,
  type InjectionKey,
  type ProducerCategory,
  type Purchasable,
  type PurchasableCategory,
  type Ref,
  type Resource,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import {
  ANCHORS,
  TECHNIQUES,
  senpaiBaseCost,
  senpaiGrowth,
  senpaiTrainRate,
  studentBaseCost,
  studentGrowth,
  studentRate,
  techniqueCost,
  temperBaseCost,
  temperGrowth,
  type TechniqueDef,
  type TechniqueId,
} from '../data';
import type { Purchase } from './kata-lang';
import { LineageKey } from './lineage';
import { ScripterTuningRegistryKey, type ScripterTunableKey } from './tuning';

/**
 * The run: Ki, the students who meditate it, the senpai who train more of them, the
 * Temper of the fist and the techniques the dojo has learned. Graduation resets this
 * module's whole context, so everything here lasts one student.
 */

interface ProducerDef {
  id: 'student' | 'senpai';
}

export interface DojoApi {
  ki: Resource;
  /** Students the senpai have trained this run; they meditate alongside the hired ones. */
  trained: Resource;
  producers: ProducerCategory<ProducerDef>;
  students: Purchasable;
  senpai: Purchasable;
  temper: Purchasable;
  techniques: PurchasableCategory<TechniqueDef>;
  knows(id: TechniqueId): boolean;
  /** Ki per second from meditation. */
  kiRate: ComputedRef<Decimal>;
  /** Ki a training strike banks: the floor plus (strike seconds + Temper) of income. */
  strikeValue: ComputedRef<Decimal>;
  /** A blow in a bout, in fist points: 1 + Temper. */
  fist: ComputedRef<number>;
  /** Students on the floor, hired and trained. */
  studentCount: ComputedRef<number>;
  /** Ki earned this run, spent or not. */
  runKi: Ref<DecimalSource>;
  /** Make a purchase if the purse allows; returns how many were bought. */
  buy(what: Purchase, max: boolean): DecimalSource;
  /** Whether one of a purchase is affordable now: what `ready` reads. */
  ready(what: Purchase): boolean;
  learn(id: TechniqueId): boolean;
}

export const DojoKey: InjectionKey<DojoApi> = Symbol('scripter/dojo') as InjectionKey<DojoApi>;

const dojoApi = createModuleApi(DojoKey);

/** The run: Ki, its producers, Temper and the techniques. Read it after the engine starts. */
export const getDojo = dojoApi.get;

export function createDojoModule(): EngineModule {
  return {
    id: 'scripter/dojo',
    dependencies: ['scripter/tuning', 'scripter/lineage'],
    install(ctx) {
      const tuning = ctx.inject(ScripterTuningRegistryKey);
      const lineage = ctx.inject(LineageKey);
      const t = (key: ScripterTunableKey, get: () => number) => tunable(tuning, key, get);

      // Graduation's wipe of this context zeroes `sinceReset`, so it is the run's Ki.
      const ki = createResource<DecimalSource>(0, {
        id: 'ki',
        displayName: 'Ki',
        decimals: 1,
        trackSinceReset: true,
      });
      const trained = createResource<DecimalSource>(0, {
        id: 'trained',
        displayName: 'Trained students',
      });

      const techniques = createPurchasableCategory<TechniqueDef>({
        id: 'techniques',
        mapPurchasable: (def) => ({
          display: { title: def.displayName, description: def.lore },
          requirements: [
            createCostRequirement({ resource: ki, cost: techniqueCost(def.id) }),
            ...(def.after.length
              ? [
                  createGateRequirement({
                    gate: {
                      kind: 'all',
                      of: def.after.map((id): Gate => ({
                        kind: 'active',
                        category: 'techniques',
                        entry: id,
                      })),
                    },
                    // Names only the prerequisites still unlearned; the shelf prints it as is.
                    description: (): string =>
                      `learn ${def.after
                        .filter((id) => !knows(id))
                        .map((id) => TECHNIQUES.find((x) => x.id === id)!.displayName)
                        .join(' and ')} first`,
                  }),
                ]
              : []),
          ],
          limit: 1,
          // An answer goes on the shelf when its challenger first steps through the gate.
          visible: () => def.answers === null || lineage.arrived.value.includes(def.answers),
        }),
      });
      techniques.register(TECHNIQUES);
      const knows = (id: TechniqueId) => techniques.getPurchasable(id)?.active.value ?? false;

      const studentCost = t('student/baseCost', () => studentBaseCost);
      const studentRatio = t('student/growth', () => studentGrowth);
      const rate = t('student/rate', () => studentRate);
      const senpaiCost = t('senpai/baseCost', () => senpaiBaseCost);
      const senpaiRatio = t('senpai/growth', () => senpaiGrowth);
      const trainRate = t('senpai/trainRate', () => senpaiTrainRate);
      const producers = createProducerCategory<ProducerDef>({
        id: 'producers',
        registerTick: ctx.onTick,
        mapProducer: (def) =>
          def.id === 'student'
            ? {
                resource: ki,
                baseRate: () => rate.value,
                trigger: 'continuous',
                purchase: {
                  costResource: ki,
                  baseCost: () => studentCost.value,
                  costRatio: () => studentRatio.value,
                },
                // Students a senpai trained meditate alongside the hired ones: the cascade.
                extraCount: () => trained.value,
              }
            : {
                resource: trained,
                baseRate: () => trainRate.value,
                trigger: 'continuous',
                purchase: {
                  costResource: ki,
                  baseCost: () => senpaiCost.value,
                  costRatio: () => senpaiRatio.value,
                  visible: () => knows('lineage'),
                },
              },
        mapState: (def, producer) => {
          if (def.id === 'student')
            producer.rateChain.bind({ modifier: lineage.kiChain, text: 'Ki' });
        },
      });
      producers.register([{ id: 'student' }, { id: 'senpai' }]);
      const students = producers.getEntry('student')!.producer.purchasable!;
      const senpai = producers.getEntry('senpai')!.producer.purchasable!;

      const temperCost = t('temper/baseCost', () => temperBaseCost);
      const temperRatio = t('temper/growth', () => temperGrowth);
      const temper = createScalingPurchasable({
        id: 'temper',
        title: 'Temper',
        description:
          'Each level: every blow lands harder, and a training strike banks one more second of income.',
        resource: ki,
        baseCost: () => temperCost.value,
        costRatio: () => temperRatio.value,
        visible: () => knows('iron-body'),
      });

      const strikeSeconds = t('strike/seconds', () => ANCHORS.strikeSecondsBase);
      const kiRate = computed(() => Decimal.fromValue(producers.getTotalRate(ki)));
      const strikeValue = computed(() =>
        Decimal.add(
          ANCHORS.strikeKiFloor,
          Decimal.mul(Decimal.add(strikeSeconds.value, temper.count.value), kiRate.value),
        ),
      );
      const fist = computed(() => 1 + Decimal.fromValue(temper.count.value).toNumber());
      const studentCount = computed(() =>
        Decimal.fromValue(producers.getEntry('student')!.producer.count.value).toNumber(),
      );

      const target = (what: Purchase): Purchasable =>
        what === 'recruit' ? students : what === 'promote' ? senpai : temper;
      const usable = (what: Purchase) =>
        what === 'recruit' || (what === 'promote' ? knows('lineage') : knows('iron-body'));

      dojoApi.publish(ctx, {
        ki,
        trained,
        producers,
        students,
        senpai,
        temper,
        techniques,
        knows,
        kiRate,
        strikeValue,
        fist,
        studentCount,
        runKi: ki.sinceReset!,
        ready: (what) => usable(what) && target(what).canPurchase.value,
        buy(what, max) {
          const p = target(what);
          if (!usable(what) || !p.canPurchase.value) return 0;
          return p.purchase(max ? undefined : 1);
        },
        learn(id) {
          const p = techniques.getPurchasable(id);
          if (!p?.canPurchase.value) return false;
          p.purchase(1);
          lineage.say('learn', `learned ${TECHNIQUES.find((x) => x.id === id)!.displayName}`);
          return true;
        },
      });
    },
  };
}
