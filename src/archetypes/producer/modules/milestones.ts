import { unref } from 'vue';
import {
  Decimal,
  createMultiplicativeModifier,
  createTieredAchievement,
  getEarnedCount,
  tunable,
  type DecimalSource,
  type EngineModule,
} from '@open-loop/engine';
import type { ProducerData } from '../data/types';
import { ProducerTuningRegistryKey, getBuildings } from './producers';

/**
 * Per-producer count thresholds that fire milestone achievements. Plain
 * const, not a `tunable()` — structural cardinality (array length) is not
 * solver perturbation surface per `override-registry.ts:329` negative
 * criteria. Canonical: `Game.Win` calls inside each building's callback
 * (`main.js:9019+`) — 1, 50, 100, 150, … per-building. Tighter byte
 * anchoring lands when building callbacks integrate.
 */
export const MILESTONE_THRESHOLDS: DecimalSource[] = [
  1, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
];

export function createMilestonesModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/milestones',
    dependencies: ['producer/producers'],
    install(ctx) {
      const buildings = getBuildings();
      const tuningRegistry = ctx.inject(ProducerTuningRegistryKey);
      // Per-tier multiplicative bonus the per-building milestone series
      // binds into each producer's rateChain (×1.10). Declared-invention
      // stand-in for the canonical milk/kitten composition at the
      // per-producer scope (spec § 5).
      const bonusPerTier = tunable(tuningRegistry, 'balance/milestoneBonusPerTier', () => 1.1);

      for (const def of data.producers) {
        if (def.trigger !== 'continuous') continue;
        const producer = buildings.getProducer(def.id);
        if (!producer) continue;

        const tiers = createTieredAchievement<number>({
          baseId: `milestone/${def.id}`,
          baseName: `${def.name} milestone`,
          getValue: () => producer.count.value,
          tiers: MILESTONE_THRESHOLDS.map((t) => ({
            threshold: t,
            suffix: `×${t}`,
          })),
        });

        producer.rateChain.bind({
          id: `milestones/${def.id}`,
          modifier: createMultiplicativeModifier({
            multiplier: () => Decimal.pow(unref(bonusPerTier), getEarnedCount(tiers)),
            description: `${def.name} milestones`,
          }),
        });
      }
    },
  };
}
