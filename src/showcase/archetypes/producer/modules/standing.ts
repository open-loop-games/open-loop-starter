import {
  Decimal,
  computed,
  createAchievementCategory,
  createCostRequirement,
  createPurchasableCategory,
  type AchievementCategory,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Predicate,
  type PurchasableCategory,
} from '@open-loop/engine';
import {
  CASH,
  FEATS,
  FEAT_DEFS,
  STANDING,
  STANDING_DEFS,
  STANDING_DIVISOR,
  SUBSIDIARIES,
  type FeatDef,
  type StandingDef,
} from '../data';
import { FirmKey } from './firm';
import { AutomationKey } from './automation';
import { TipsKey } from './tips';

/**
 * Standing: what the firm's record is worth. Every achievement (a certificate, a
 * grade, a feat) counts toward standing, STANDING_DIVISOR to a point, and each
 * standing upgrade bought multiplies all income by (1 + standing × k). Standing
 * earned after a purchase keeps raising it, so breadth pays: an achievement on any
 * holding lifts every one.
 */

export interface StandingApi {
  feats: AchievementCategory<FeatDef>;
  /** Achievements earned across certificates, grades and feats. */
  achievements: ComputedRef<number>;
  standing: ComputedRef<number>;
  upgrades: PurchasableCategory<StandingDef>;
}

export const StandingKey: InjectionKey<StandingApi> = Symbol(
  'producer/standing',
) as InjectionKey<StandingApi>;

let api: StandingApi;

export function getStanding(): StandingApi {
  return api;
}

export function createStandingModule(): EngineModule {
  return {
    id: 'producer/standing',
    dependencies: ['producer/firm', 'producer/automation', 'producer/tips'],
    install(ctx) {
      const firm = ctx.inject(FirmKey);
      const automation = ctx.inject(AutomationKey);
      const tips = ctx.inject(TipsKey);
      const num = (v: unknown) => Decimal.fromValue(v as never).toNumber();

      const goalFor = (def: FeatDef): Predicate => {
        switch (def.kind) {
          case 'first':
          case 'own':
            return {
              kind: 'count-gte',
              category: SUBSIDIARIES,
              entry: def.subsidiary!,
              value: def.threshold,
            };
          case 'revenue':
            return { kind: 'cumulative-gte', resource: CASH, value: def.threshold };
          case 'income':
            return () => automation.income.value.gte(def.threshold);
          case 'phones':
            return () => num(automation.phone.count.value) >= def.threshold;
          case 'tips':
            return () => tips.caught.value >= def.threshold;
          case 'deals':
            return () => firm.handDeals.value >= def.threshold;
        }
      };

      const feats = createAchievementCategory<FeatDef>({
        id: FEATS,
        mapAchievement: (def) => ({
          display: { title: def.title },
          goal: goalFor(def),
          onComplete: () => firm.post('milestone', def.title.toLowerCase()),
        }),
      });
      feats.register(FEAT_DEFS);

      const earned = (c: AchievementCategory<{ id: string }>) =>
        c.getAll().filter((e) => e.achievement.earned.value).length;
      const achievements = computed(
        () => earned(firm.milestones) + earned(firm.grades) + earned(feats),
      );
      const standing = computed(() => achievements.value / STANDING_DIVISOR);

      const upgrades = createPurchasableCategory<StandingDef>({
        id: STANDING,
        mapPurchasable: (def) => ({
          display: { title: def.title, description: def.description },
          requirements: createCostRequirement({ resource: firm.cash, cost: def.cost }),
          limit: 1,
          visible: () => standing.value >= def.standing,
          grants: [
            {
              chain: firm.operations,
              multiplier: () => 1 + standing.value * def.k,
              description: def.title,
            },
          ],
        }),
        mapState: (def, p) => {
          p.on('purchased', () => firm.post('manage', def.title, -def.cost));
        },
      });
      upgrades.register(STANDING_DEFS);

      api = { feats, achievements, standing, upgrades };
      ctx.provide(StandingKey, api);
    },
  };
}
