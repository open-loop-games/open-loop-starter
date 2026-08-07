import { computed, unref } from 'vue';
import {
  Decimal,
  createAchievementCategory,
  createMultiplicativeModifier,
  getCombinedAchievementEffect,
  toNumber,
  tunable,
  type Achievement,
  type AchievementCategory,
  type DecimalSource,
  type EngineModule,
} from '@open-loop/engine';
import type { AchievementDef, AmbientData, AmbientGameState } from '../data/types';
import {
  AmbientTuningRegistryKey,
  PrimaryLifetimeKey,
  getAutoProducers,
  getPrimaryResource,
} from './auto-producers';
import { getUnlocks } from './unlocks';
import { SceneKey } from './scene';
import { SessionClockKey } from './session-clock';

let achievements: AchievementCategory<AchievementDef, unknown>;

export function getAchievements(): AchievementCategory<AchievementDef, unknown> {
  return achievements;
}

/**
 * Default per-achievement headline contribution. Used as the fallback for
 * `AchievementDef.rewardMultiplier` and as the default closure for the
 * `balance/achievementMultiplier` tunable. The structural-invariant probe
 * in `sim/data-invariants.test.ts` imports this directly.
 */
export const DEFAULT_ACHIEVEMENT_MULTIPLIER = 1.02;

/**
 * Ambient's achievement category. Each `AchievementDef.requirement` closure is
 * lowered into a Vue `computed` that reads predicate methods on `state`; those
 * methods read `.value` on injection-key refs (primary, lifetime, scene zones,
 * session-clock writable refs), so reactivity flows naturally — no `ctx.onLoad`
 * walk needed for `triggeredOnResume` entries. AppRoot writes
 * `sessionClock.lastResumeGapSec.value` post-load, the resume-flagged
 * predicates re-evaluate, and the category fires earned through its existing
 * watcher path. The flag is data-side metadata (a hint about *when* the
 * predicate becomes true), not a separate evaluation channel.
 *
 * Rate-bonus shape is G-M10: each achievement's `effect` returns its per-
 * achievement multiplier (`def.rewardMultiplier ?? DEFAULT_ACHIEVEMENT_MULTIPLIER`),
 * and a single multiplicative modifier per producer rateChain folds the active
 * set via `getCombinedAchievementEffect`.
 */
export function createAchievementsModule(data: AmbientData): EngineModule {
  return {
    id: 'ambient/achievements',
    dependencies: [
      'ambient/auto-producers',
      'ambient/unlocks',
      'ambient/scene',
      'ambient/session-clock',
    ],
    install(ctx) {
      const buildings = getAutoProducers();
      const unlocks = getUnlocks();
      const scene = ctx.inject(SceneKey);
      const primary = getPrimaryResource();
      const primaryLifetime = ctx.inject(PrimaryLifetimeKey);
      const sessionClock = ctx.inject(SessionClockKey);
      const tuningRegistry = ctx.inject(AmbientTuningRegistryKey);

      const headlineRate = computed(() => buildings.getTotalRate(primary));

      const state: AmbientGameState = {
        primaryAtLeast: (amount) => Decimal.gte(primary.value, amount),
        primaryLifetimeAtLeast: (amount) => Decimal.gte(primaryLifetime.value, amount),
        perSecondAtLeast: (amount) => Decimal.gte(headlineRate.value, amount),
        producerCountAtLeast: (id, count) => {
          const p = buildings.getProducer(id);
          if (!p) return false;
          return Decimal.gte(p.count.value, count);
        },
        unlockVisible: (id) => unlocks.getPurchasable(id)?.active.value ?? false,
        sceneVariantUnlocked: (id) => scene.zones.isUnlocked(id),
        ownsEveryProducer: () =>
          data.producers.every((p) => {
            const producer = buildings.getProducer(p.id);
            return producer ? Decimal.gte(producer.count.value, 1) : false;
          }),
        secondsSinceLastResume: () => sessionClock.secondsSinceLastResume.value,
        secondsSinceCreation: () => sessionClock.secondsSinceCreation.value,
        offlineGapAtLeast: (seconds) => sessionClock.lastResumeGapSec.value >= seconds,
      };

      const achievementMultiplier = tunable<DecimalSource>(
        tuningRegistry,
        'balance/achievementMultiplier',
        () => DEFAULT_ACHIEVEMENT_MULTIPLIER,
      );

      achievements = createAchievementCategory<AchievementDef>({
        id: 'ambient/achievements',
        mapAchievement: (def) => ({
          display: { title: def.name, description: def.description },
          requirement: computed(() => def.requirement(state)),
          hidden: def.hidden ?? false,
          effect: (): number => {
            const raw = def.rewardMultiplier ?? unref(achievementMultiplier);
            return toNumber(raw);
          },
        }),
      });
      achievements.register(data.achievements);

      // G-M10 — one multiplicative modifier per producer rateChain over the
      // cumulative earned-achievement product. Replaces per-achievement Grants
      // with a single binding whose getter folds the active set.
      const allAchievements = achievements
        .getAll()
        .map((entry) => entry.achievement) as Achievement<number>[];

      for (const def of data.producers) {
        const producer = buildings.getProducer(def.id);
        if (!producer) continue;
        producer.rateChain.bind({
          id: `achievements/${def.id}`,
          modifier: createMultiplicativeModifier({
            multiplier: () => getCombinedAchievementEffect(allAchievements),
            description: 'Achievements',
          }),
        });
      }
    },
  };
}
