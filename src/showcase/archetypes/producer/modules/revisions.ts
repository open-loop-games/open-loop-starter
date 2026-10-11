import { computed, unref } from 'vue';
import {
  createAchievementCategory,
  createMultiplicativeModifier,
  getCombinedAchievementEffect,
  toNumber,
  tunable,
  type Achievement,
  type AchievementCategory,
  type EngineModule,
} from '@open-loop/engine';
import type { ProducerData, RevisionDef } from '../data/types';
import { DEFAULT_REVISION_MULTIPLIER } from '../data/revisions';
import { getClasses } from './swarm';
import { getProducerGameState } from './refinements';
import { ProducerTuningRegistryKey } from './tuning';

/**
 * Revisions — the earned chain. Threshold-triggered achievements, each
 * contributing a global multiplicative factor folded by
 * `getCombinedAchievementEffect` into one binding per class.
 *
 * One binding per class rather than one per revision per class: the fold is
 * what keeps the chain readable in a breakdown (19 revisions would otherwise
 * be 19 rows saying nothing individually).
 *
 * The launcher chain is deliberately NOT bound here. A revision is a
 * swarm-wide firmware push and the player is not a probe — which is also what
 * keeps the click-vs-ladder crossover a clean measurement rather than a
 * self-referential one.
 */

let revisions: AchievementCategory<RevisionDef, unknown>;

export function getRevisions(): AchievementCategory<RevisionDef, unknown> {
  return revisions;
}

export function createRevisionsModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/revisions',
    dependencies: ['producer/tuning', 'producer/swarm', 'producer/refinements'],
    install(ctx) {
      const classes = getClasses();
      const state = getProducerGameState();
      const registry = ctx.inject(ProducerTuningRegistryKey);

      const defaultMultiplier = tunable(
        registry,
        'balance/revisionMultiplier',
        () => DEFAULT_REVISION_MULTIPLIER,
      );

      revisions = createAchievementCategory<RevisionDef>({
        id: 'producer/revisions',
        mapAchievement: (def) => ({
          display: { title: def.name, description: def.description },
          goal: computed(() => def.requirement(state)),
          effect: (): number => toNumber(def.multiplier ?? unref(defaultMultiplier)),
        }),
      });
      revisions.register(data.revisions);

      const earned = revisions.getAll().map((entry) => entry.achievement) as Achievement<number>[];

      for (const def of data.classes) {
        const producer = classes.getProducer(def.id);
        if (!producer) continue;
        producer.rateChain.bind({
          id: `revisions/${def.id}`,
          modifier: createMultiplicativeModifier({
            multiplier: () => getCombinedAchievementEffect(earned),
            description: 'Revisions',
          }),
        });
      }
    },
  };
}
