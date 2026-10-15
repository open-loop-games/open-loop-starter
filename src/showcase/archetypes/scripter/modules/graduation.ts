import {
  Decimal,
  addResource,
  computed,
  createReset,
  tunable,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { ANCHORS, GRADUATION_THRESHOLD, META, SCROLLS, type ScrollId } from '../data';
import { DojoKey } from './dojo';
import { GateKey } from './gate';
import { KataKey } from './kata';
import { LineageKey } from './lineage';
import { ScripterTuningRegistryKey, type ScripterTunableKey } from './tuning';

/**
 * Graduation: the student departs on pilgrimage. The dojo resets (Ki, students, senpai,
 * Temper, and the techniques unless Remembered Forms is studied); the scroll, the rack,
 * the records, the gate and the student's executor tier survive. The run pays
 * ⌊(run Ki / threshold)^½⌋ Insight, which buys the old master's scrolls.
 */

export interface GraduationApi {
  pendingInsight: ComputedRef<number>;
  threshold: ComputedRef<number>;
  graduate(): number;
  study(id: ScrollId): boolean;
}

export const GraduationKey: InjectionKey<GraduationApi> = Symbol(
  'scripter/graduation',
) as InjectionKey<GraduationApi>;

const graduationApi = createModuleApi(GraduationKey);

/** Graduation and the old master's scrolls. Read it after the engine starts. */
export const getGraduation = graduationApi.get;

export function createGraduationModule(): EngineModule {
  return {
    id: 'scripter/graduation',
    dependencies: [
      'scripter/tuning',
      'scripter/lineage',
      'scripter/dojo',
      'scripter/gate',
      'scripter/kata',
    ],
    install(ctx) {
      const tuning = ctx.inject(ScripterTuningRegistryKey);
      const lineage = ctx.inject(LineageKey);
      const dojo = ctx.inject(DojoKey);
      const gate = ctx.inject(GateKey);
      const kata = ctx.inject(KataKey);

      const reset = createReset({
        resetPersistentContexts: ['scripter/dojo'],
        // Remembered Forms is the conditional exemption: techniques ride through when studied.
        retain: new Map(
          dojo.techniques
            .getAll()
            .map(
              (e) =>
                [
                  e.purchasable.count,
                  (v: DecimalSource) => (lineage.level('remembered-forms') > 0 ? v : 0),
                ] as const,
            ),
        ),
      });
      const base = tunable(
        tuning,
        'graduation/threshold' satisfies ScripterTunableKey,
        () => GRADUATION_THRESHOLD,
      );
      const threshold = computed(() => Number(base.value));
      const pendingInsight = computed(() => {
        const run = Decimal.fromValue(dojo.runKi.value);
        if (run.lt(threshold.value)) return 0;
        return run.div(threshold.value).pow(ANCHORS.insightExponent).floor().toNumber();
      });

      graduationApi.publish(ctx, {
        pendingInsight,
        threshold,
        graduate() {
          const gain = pendingInsight.value;
          if (gain < 1) return 0;
          gate.abort();
          reset.reset();
          // Credited after reset() returns, so it reaches Insight's lifetime record.
          addResource(lineage.insight, gain);
          lineage.graduations.value++;
          const founding = META['founding-students'].effect * lineage.level('founding-students');
          if (founding > 0) dojo.students.count.value = founding;
          lineage.say('rite', `Graduation: the student departs on pilgrimage. +${gain} Insight.`);
          kata.revalidate();
          return gain;
        },
        study(id) {
          const p = lineage.scrolls.getPurchasable(id);
          if (!p?.canPurchase.value) return false;
          p.purchase(1);
          lineage.say('learn', `studied ${SCROLLS.find((s) => s.id === id)!.displayName}`);
          return true;
        },
      });
    },
  };
}
