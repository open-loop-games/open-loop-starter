import { unref } from 'vue';
import {
  Decimal,
  createAchievementCategory,
  createMultiplicativeModifier,
  getCombinedAchievementEffect,
  toNumber,
  tunable,
  type Achievement,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
  type ModifierChain,
} from 'open-loop-engine';
import type { AchievementDef, ScalerData, Tier } from '../data/types';
import { ScalerTiersKey, type ScalerTier } from './tiers';
import { ScalerTuningRegistryKey } from './tuning';

// === Module ===
//
// Achievements ride on the engine `Gate` system from day one — `data/
// achievements.ts` ships pure Gate literals (`cumulative-gte`,
// `count-gte`, `all`/`any`) and the engine's Achievement.requirement field
// projects each Gate to a reactive boolean via `evaluateGate`. The legacy
// ScalerGameState predicate vtable is gone; per-tier reward routing lives
// here as a single multiplicative modifier per rate chain whose value is
// `(achievementMultiplier ^ earnedCount)` via `getCombinedAchievementEffect`.
//
// vanilla canonical: SynergismOfficial/src/Achievements.ts (per-tier
// achievement groups + reward formulas). Slim port carries milestone
// thresholds + tier classification 1:1; reward shape is uniform
// multiplicative-into-tier-chain per the slim-port simplification.
//
// connect() runs after every tier's connect(), so ScalerTiersKey is fully
// populated by the time we read it for chain bindings.
export function createAchievementsModule(data: ScalerData): EngineModule {
  return {
    id: 'scaler/achievements',
    dependencies: [
      'scaler/antimatter',
      'scaler/prestige',
      'scaler/prestige-vault',
      'scaler/transcend',
    ],
    install(): void {
      // All wiring is connect-time — chain bindings need every tier's
      // producer rateChains, which are only fully present once dependent
      // tiers' connect() runs have completed.
    },
    connect(ctx: EngineContext): void {
      const tiers = ctx.inject(ScalerTiersKey);
      const antimatter = mustFindTier(tiers, 'antimatter');
      const prestige = mustFindTier(tiers, 'prestige');
      const transcend = mustFindTier(tiers, 'transcend');

      const tuningRegistry = ctx.inject(ScalerTuningRegistryKey);
      const achievementMultiplier = tunable<DecimalSource>(
        tuningRegistry,
        'balance/achievementMultiplier',
        () => data.balance.achievementMultiplier,
      );

      const tierChains: Record<Tier, ModifierChain[]> = {
        antimatter: antimatter.producers.getAll().map((entry) => entry.producer.rateChain),
        prestige: prestige.producers.getAll().map((entry) => entry.producer.rateChain),
        transcend: transcend.producers.getAll().map((entry) => entry.producer.rateChain),
      };

      const achievements = createAchievementCategory<AchievementDef>({
        id: 'scaler/achievements',
        mapAchievement: (def) => ({
          display: { title: def.name, description: def.description },
          requirement: def.requirement,
          hidden: def.hidden ?? false,
          // Per-achievement reward read at evaluation time. `def.rewardMultiplier`
          // overrides the cross-tier `balance.achievementMultiplier` default;
          // fold to a number for `getCombinedAchievementEffect`'s product walker.
          effect: (): number => toNumber(def.rewardMultiplier ?? unref(achievementMultiplier)),
        }),
      });
      achievements.register(data.achievements);

      // One multiplicative modifier per rate chain. Multiplier is the
      // product of every earned achievement's effect, partitioned by tier
      // so prestige achievements only lift prestige chains, transcend only
      // transcend, etc. Synergism's per-tier reward pattern preserved.
      const allEntries = achievements.getAll();
      for (const tierId of ['antimatter', 'prestige', 'transcend'] as const) {
        const tierEntries = allEntries.filter((e) => e.def.tier === tierId);
        const tierAchievements = tierEntries.map((e) => e.achievement) as Achievement<number>[];
        if (tierAchievements.length === 0) continue;
        for (const chain of tierChains[tierId]) {
          chain.bind({
            id: `achievements/${tierId}`,
            modifier: createMultiplicativeModifier({
              multiplier: () => Decimal.fromValue(getCombinedAchievementEffect(tierAchievements)),
              description: `${tierId} achievements`,
            }),
          });
        }
      }
    },
  };
}

function mustFindTier(tiers: ScalerTier[], id: Tier): ScalerTier {
  const t = tiers.find((x) => x.id === id);
  if (!t) throw new Error(`scaler/achievements: tier '${id}' missing from ScalerTiersKey`);
  return t;
}
