/**
 * Cookie Factory — total-conversion archetype mod (OL-425 / OL-404 pilot).
 *
 * Self-contained game: single `cookies` resource, 7 producer tiers, 7 per-
 * producer scaling upgrades, 21 achievements. No loop, no skills, no actions.
 * Uses only the producer + purchasable + achievement + modifier-chain surface
 * of the engine — the "30% slice" stress test from ARCHETYPES.md.
 *
 * cc-authentic (sibling mod) registers the same CookieFactoryKey shape with
 * Cookie Clicker constants so both share CFLayout/panels.
 */
import {
  Decimal,
  createResource,
  createProducerCategory,
  createScalingPurchasable,
  createAchievementCategory,
  createModifierChain,
  createMultiplicativeModifier,
  additiveEffect,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type ProducerCategory,
  type Purchasable,
  type AchievementCategory,
  type ModifierChain,
} from 'open-loop-engine';
import { setSlot } from '@/modules/ui-registry';
import CFLayout from '@/ui/layouts/CFLayout.vue';
import {
  producers as producerDefs,
  upgrades as upgradeDefs,
  achievements as achievementDefs,
  type CFProducerDef,
  type CFUpgradeDef,
  type CFAchievementDef,
} from './content';

export interface CookieFactoryState {
  cookies: Resource<DecimalSource>;
  producers: ProducerCategory<CFProducerDef>;
  upgrades: Purchasable[];
  achievements: AchievementCategory<CFAchievementDef>;
  /** Surface-wide chain — prestige/other follow-ups can push onto this. */
  productionChain: ModifierChain;
}

export const CookieFactoryKey: InjectionKey<CookieFactoryState> =
  Symbol('cookie-factory') as InjectionKey<CookieFactoryState>;

/**
 * Installs the Cookie Factory content onto the engine using the given
 * constant tables. Exported so cc-authentic can reuse the wiring with
 * CC's exact constants — the two mods share install logic but not data.
 */
export function installCookieFactoryContent(
  ctx: EngineContext,
  opts: {
    producers: CFProducerDef[];
    upgrades: CFUpgradeDef[];
    achievements: CFAchievementDef[];
  },
): void {
  const cookies = createResource<DecimalSource>(Decimal.dZero, { displayName: 'Cookies' });

  // --- Producers ---
  const producers = createProducerCategory<CFProducerDef>({
    id: 'cf-producers',
    registerTick: ctx.onTick,
    mapProducer: (def) => ({
      resource: cookies,
      trigger: 'continuous',
      baseRate: def.baseRate,
      display: def.name,
      purchase: {
        costResource: cookies,
        baseCost: def.baseCost,
        costScaling: def.costScaling,
      },
    }),
  });
  producers.register(opts.producers);

  // --- Surface-wide production chain ---
  // Applied to every producer so downstream mods (or this mod's own globals)
  // can stack multipliers without touching individual producer chains.
  const productionChain = createModifierChain('cf-production');
  for (const entry of producers.getAll()) {
    entry.producer.rateChain.add(productionChain);
  }

  // --- Upgrades (per-producer scaling purchasables) ---
  // Each upgrade's effect becomes a multiplicative modifier on its target
  // producer's rate chain. `additiveEffect(perLevel, 1)` gives
  // effect.value = 1 + level * perLevel, so level 0 is a no-op.
  const upgradePurchasables: Purchasable[] = [];
  for (const def of opts.upgrades) {
    const up = createScalingPurchasable({
      id: def.id,
      resource: cookies,
      baseCost: def.baseCost,
      costScaling: def.costScaling,
      limit: def.limit,
      effect: additiveEffect(def.perLevel, 1),
      title: def.title,
      description: def.description,
    });
    upgradePurchasables.push(up);

    const targetEntry = producers.getEntry(def.target);
    if (!targetEntry) {
      throw new Error(`CF upgrade ${def.id} targets unknown producer ${def.target}`);
    }
    targetEntry.producer.rateChain.add(
      createMultiplicativeModifier({
        multiplier: () => up.effect.value,
        description: def.title,
      }),
    );
  }

  // --- Achievements ---
  // Requirement closures read producer counts or the cookies resource. The
  // achievement category auto-earns via Vue watch; no tick polling.
  const achievements = createAchievementCategory<CFAchievementDef>({
    id: 'cf-achievements',
    mapAchievement: (def) => ({
      display: { title: def.title, description: def.description },
      requirement: () => {
        if (def.target === 'global') {
          return Decimal.gte(cookies.value, def.threshold);
        }
        const entry = producers.getEntry(def.target);
        return entry ? Decimal.gte(entry.producer.count.value, def.threshold) : false;
      },
    }),
  });
  achievements.register(opts.achievements);

  // Wire achievement bonuses onto the correct rate chain. Must happen after
  // register so the achievement instances exist. Per-producer bonuses bind
  // to that producer's chain; global bonuses join productionChain.
  for (const { def, achievement } of achievements.getAll()) {
    const modifier = createMultiplicativeModifier({
      multiplier: () => (achievement.earned.value ? def.bonus : 1),
      description: def.title,
    });
    if (def.target === 'global') {
      productionChain.add(modifier);
    } else {
      const entry = producers.getEntry(def.target);
      entry?.producer.rateChain.add(modifier);
    }
  }

  const state: CookieFactoryState = {
    cookies,
    producers,
    upgrades: upgradePurchasables,
    achievements,
    productionChain,
  };
  ctx.provide(CookieFactoryKey, state);
  setSlot('game-layout', CFLayout);
}

export const cookieFactoryModule: EngineModule = {
  id: 'cookie-factory',
  dependencies: ['settings', 'ui-registry'],
  install(ctx: EngineContext) {
    installCookieFactoryContent(ctx, {
      producers: producerDefs,
      upgrades: upgradeDefs,
      achievements: achievementDefs,
    });
  },
};
