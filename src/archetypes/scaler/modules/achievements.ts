import { computed } from 'vue';
import {
  Decimal,
  type AchievementCategory,
  type EngineContext,
  type EngineModule,
  type Grant,
  type InjectionKey,
  type ModifierChain,
  createAchievementCategory,
} from 'open-loop-engine';
import type { AchievementDef, ScalerData, ScalerGameState, Tier } from '../data/types';
import { ScalerTiersKey, type ScalerTier } from './tiers';

// === Injection keys ===

export const AchievementsKey: InjectionKey<AchievementCategory<AchievementDef>> = Symbol(
  'scaler/achievements',
) as InjectionKey<AchievementCategory<AchievementDef>>;

// === Module ===
//
// Achievements bridge data-side requirement closures to live engine state
// through ScalerGameState (data/types.ts:163). Per-tier reward routing:
// each achievement's reward multiplier feeds the rate chains of its tier,
// matching Synergism's pattern of awardAchievement → reward function →
// per-tier modifier-chain factor (e.g. coinBoost → globalCoinMultiplier
// for antimatter-tier achievements).
//
// Lives entirely in connect() because it reads ScalerTiersKey, which is
// fully populated only after every tier's connect() has run.
//
// vanilla canonical: SynergismOfficial/src/Achievements.ts (per-tier
// achievement groups + reward formulas). Slim port carries the milestone
// thresholds + tier classification 1:1 from leaf-1 data; reward shape is
// uniform multiplicative-into-tier-chain per the slim-port simplification.
export function createAchievementsModule(data: ScalerData): EngineModule {
  return {
    id: 'scaler/achievements',
    dependencies: ['scaler/antimatter', 'scaler/prestige', 'scaler/transcend'],
    install(): void {
      // All wiring is connect-time (achievements read every tier's bundle
      // from ScalerTiersKey, which only fully populates after every tier's
      // connect() has run).
    },
    connect(ctx: EngineContext): void {
      const tiers = ctx.inject(ScalerTiersKey);
      const antimatter = mustFindTier(tiers, 'antimatter');
      const prestige = mustFindTier(tiers, 'prestige');
      const transcend = mustFindTier(tiers, 'transcend');

      const coin = antimatter.currency;
      const prestigePoints = prestige.currency;
      const transcendPoints = transcend.currency;
      if (!prestige.shards || !transcend.shards) {
        throw new Error('scaler/achievements: prestige/transcend tier missing shards');
      }
      const prestigeShards = prestige.shards;
      const transcendShards = transcend.shards;
      if (!transcend.challenges) {
        throw new Error('scaler/achievements: transcend tier missing challenges');
      }
      const challenges = transcend.challenges;

      const tierChains: Record<Tier, ModifierChain[]> = {
        antimatter: antimatter.producers.getAll().map((entry) => entry.producer.rateChain),
        prestige: prestige.producers.getAll().map((entry) => entry.producer.rateChain),
        transcend: transcend.producers.getAll().map((entry) => entry.producer.rateChain),
      };

      // Live read view of cross-tier state, passed to data predicates.
      // Methods encapsulate Decimal comparisons so data/*.ts stays
      // engine-runtime-free (consumer-guide § "Data and runtime separation").
      //
      // Slim-port note: prestige/transcension counts and fastest-prestige
      // timing aren't tracked yet — they need a per-conversion counter +
      // timer wired through the boot/UI layer (leaf-2 deferral). The
      // predicate stubs return `false` so dependent achievements stay
      // unearnable until the tracking lands; flagged for leaf 2c's UI
      // wiring or a follow-up sub-leaf.
      const state: ScalerGameState = {
        coinsAtLeast: (amount) => Decimal.gte(coin.value, amount),
        prestigePointsAtLeast: (amount) => Decimal.gte(prestigePoints.value, amount),
        transcendPointsAtLeast: (amount) => Decimal.gte(transcendPoints.value, amount),
        prestigeShardsAtLeast: (amount) => Decimal.gte(prestigeShards.value, amount),
        transcendShardsAtLeast: (amount) => Decimal.gte(transcendShards.value, amount),
        producerCountAtLeast: (id, count) => {
          const a = antimatter.producers.getProducer(id);
          if (a) return Decimal.gte(a.count.value, count);
          const p = prestige.producers.getProducer(id);
          if (p) return Decimal.gte(p.count.value, count);
          const t = transcend.producers.getProducer(id);
          if (t) return Decimal.gte(t.count.value, count);
          return false;
        },
        prestigeCountAtLeast: () => false,
        transcensionCountAtLeast: () => false,
        challengeCompletionsAtLeast: (id, count) =>
          (challenges.getChallenge(id)?.completions.value ?? 0) >= count,
        fastestPrestigeUnder: () => false,
      };

      const achievements = createAchievementCategory<AchievementDef>({
        id: 'scaler/achievements',
        mapAchievement: (def) => {
          const grants: Grant[] = [
            {
              chain: tierChains[def.tier],
              mult: def.rewardMultiplier ?? data.balance.achievementMultiplier,
              description: def.name,
            },
          ];
          return {
            display: { title: def.name, description: def.description },
            requirement: computed(() => def.requirement(state)),
            hidden: def.hidden ?? false,
            grants,
          };
        },
      });
      achievements.register(data.achievements);

      ctx.provide(AchievementsKey, achievements);
    },
  };
}

function mustFindTier(tiers: ScalerTier[], id: Tier): ScalerTier {
  const t = tiers.find((x) => x.id === id);
  if (!t) throw new Error(`scaler/achievements: tier '${id}' missing from ScalerTiersKey`);
  return t;
}
