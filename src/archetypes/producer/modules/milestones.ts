import {
  Decimal,
  createMultiplicativeModifier,
  type EngineModule,
  type InjectionKey,
} from 'open-loop-engine';
import type { ProducerData } from '../data/types';
import { BuildingsKey } from './producers';

export interface MilestoneInfo {
  producerId: string;
  threshold: number;
  description: string;
}

export interface MilestonesState {
  entries: MilestoneInfo[];
  hitCount: () => number;
  totalCount: number;
}

export const MilestonesKey: InjectionKey<MilestonesState> = Symbol(
  'producer/milestones',
) as InjectionKey<MilestonesState>;

export function createMilestonesModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/milestones',
    dependencies: ['producer/producers'],
    install(ctx) {
      const buildings = ctx.inject(BuildingsKey);
      const { milestoneThresholds, milestoneBonusPerTier } = data.balance;

      const entries: MilestoneInfo[] = [];
      const isHit: Array<() => boolean> = [];

      for (const def of data.producers) {
        if (def.trigger !== 'continuous') continue;
        const producer = buildings.getProducer(def.id);
        if (!producer) continue;
        for (const threshold of milestoneThresholds) {
          const isAtOrAbove = (): boolean => Decimal.gte(producer.count.value, threshold);
          const description = `${def.name} × ${threshold}`;
          producer.rateChain.bind({
            id: `milestone/${def.id}/${threshold}`,
            modifier: createMultiplicativeModifier({
              multiplier: milestoneBonusPerTier,
              description,
            }),
            active: isAtOrAbove,
          });
          entries.push({ producerId: def.id, threshold, description });
          isHit.push(isAtOrAbove);
        }
      }

      ctx.provide(MilestonesKey, {
        entries,
        hitCount: () => isHit.reduce((n, fn) => (fn() ? n + 1 : n), 0),
        totalCount: entries.length,
      });
    },
  };
}
