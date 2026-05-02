import { unref } from 'vue';
import {
  Decimal,
  createMultiplicativeModifier,
  createTieredAchievement,
  getEarnedCount,
  tunable,
  type EngineModule,
} from 'open-loop-engine';
import type { ProducerData } from '../data/types';
import { BuildingsKey, ProducerTuningRegistryKey } from './producers';

export function createMilestonesModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/milestones',
    dependencies: ['producer/producers'],
    install(ctx) {
      const buildings = ctx.inject(BuildingsKey);
      const tuningRegistry = ctx.inject(ProducerTuningRegistryKey);
      const bonusPerTier = tunable(
        tuningRegistry,
        'balance/milestoneBonusPerTier',
        () => data.balance.milestoneBonusPerTier,
      );

      for (const def of data.producers) {
        if (def.trigger !== 'continuous') continue;
        const producer = buildings.getProducer(def.id);
        if (!producer) continue;

        const tiers = createTieredAchievement<number>({
          baseId: `milestone/${def.id}`,
          baseName: `${def.name} milestone`,
          getValue: () => producer.count.value,
          tiers: data.balance.milestoneThresholds.map((t) => ({
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
