import { ref, type Ref } from 'vue';
import {
  Decimal,
  addResource,
  computed,
  createCostRequirement,
  createPurchasableCategory,
  createTemporaryEffectSystem,
  persistent,
  random,
  randomItem,
  withPersistentContext,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type PurchasableCategory,
  type TemporaryEffectSystem,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import {
  BULL_MULT,
  BULL_SECONDS,
  SPREE_MULT,
  SPREE_SECONDS,
  TIP_LIFETIME,
  TIP_REPEAT_STRIKE,
  TIP_UPGRADES,
  TIP_UPGRADE_DEFS,
  WINDFALL_BANK,
  WINDFALL_INCOME,
  tipChance,
  tipScale,
  type TipUpgradeDef,
} from '../data';
import { FirmKey } from './firm';
import { AutomationKey } from './automation';

/**
 * Tips on the wire: the windfall. A tip comes in on a hazard ramp and stays up a
 * few seconds; caught, it draws one of three effects. No desk catches tips, so they
 * are what an attentive player has over an idle one.
 *
 *   - bull market: every subsidiary and phone earns ×BULL_MULT for a while;
 *   - closing spree: deals by hand pay ×SPREE_MULT for a few seconds;
 *   - windfall deal: the smaller of a share of cash on hand and minutes of income,
 *     so holding cash pays.
 */

export type TipEffect = 'bull' | 'spree' | 'windfall';
export const TIP_EFFECTS: readonly TipEffect[] = ['bull', 'spree', 'windfall'];

export interface TipsApi {
  /** Seconds the tip on the wire has left, or null when none is up. */
  current: Ref<number | null>;
  /** Catch the tip that is up; returns the effect drawn, or null when none was up. */
  catchTip(): TipEffect | null;
  /** Tips caught, ever. */
  caught: Persistent<number>;
  /** The effect the last tip drew. */
  lastEffect: Persistent<TipEffect | ''>;
  /** Interval, lifetime and effect-length scale from the tip upgrades owned. */
  scale: ComputedRef<{ interval: number; lifetime: number; duration: number }>;
  effects: TemporaryEffectSystem;
  upgrades: PurchasableCategory<TipUpgradeDef>;
}

export const TipsKey: InjectionKey<TipsApi> = Symbol('producer/tips') as InjectionKey<TipsApi>;

const tipsApi = createModuleApi(TipsKey);

/** Tips on the wire and the effects in force. Read it after the engine starts. */
export const getTips = tipsApi.get;

export function createTipsModule(): EngineModule {
  return {
    id: 'producer/tips',
    dependencies: ['producer/firm', 'producer/automation'],
    install(ctx) {
      const firm = ctx.inject(FirmKey);
      const automation = ctx.inject(AutomationKey);
      const { cash, ledger } = firm;

      const { caught, lastEffect, sinceLast } = withPersistentContext('tips', () => ({
        caught: persistent<number>(0, { id: 'caught' }),
        lastEffect: persistent<TipEffect | ''>('', { id: 'last-effect' }),
        sinceLast: persistent<number>(0, { id: 'since-last' }),
      }));
      const current: Ref<number | null> = ref(null);

      const upgrades = createPurchasableCategory<TipUpgradeDef>({
        id: TIP_UPGRADES,
        mapPurchasable: (def) => ({
          display: { title: def.title, description: def.description },
          requirements: createCostRequirement({ resource: cash, cost: def.cost }),
          limit: 1,
          visible: () => caught.value >= def.caught,
        }),
        mapState: (def, p) => {
          p.on('purchased', () => ledger.post(def.title, 'manage', { amount: -def.cost }));
        },
      });
      upgrades.register(TIP_UPGRADE_DEFS);
      const scale = computed(() => tipScale(upgrades.purchasedCount.value));

      const effects = createTemporaryEffectSystem({ id: 'tip-effects', registerTick: ctx.onTick });
      effects.register([
        {
          id: 'bull',
          displayName: 'Bull market',
          duration: () => BULL_SECONDS * scale.value.duration,
          stackBehavior: 'refresh',
          grants: [{ chain: firm.operations, multiplier: BULL_MULT, description: 'Bull market' }],
        },
        {
          id: 'spree',
          displayName: 'Closing spree',
          duration: () => SPREE_SECONDS * scale.value.duration,
          stackBehavior: 'refresh',
          grants: [{ chain: firm.handChain, multiplier: SPREE_MULT, description: 'Closing spree' }],
        },
      ]);

      // The spawn clock waits while a tip is up; a tip not caught in time is gone.
      ctx.onTick((dt) => {
        if (current.value !== null) {
          current.value -= dt;
          if (current.value <= 0) {
            current.value = null;
            sinceLast.value = 0;
          }
          return;
        }
        sinceLast.value += dt;
        const perSecond = tipChance(sinceLast.value, scale.value.interval);
        if (random() < 1 - (1 - perSecond) ** dt) {
          current.value = TIP_LIFETIME * scale.value.lifetime;
        }
      });

      function catchTip(): TipEffect | null {
        if (current.value === null) return null;
        current.value = null;
        sinceLast.value = 0;
        // An even pick, with the last effect struck four times in five.
        const pool =
          lastEffect.value && random() < TIP_REPEAT_STRIKE
            ? TIP_EFFECTS.filter((e) => e !== lastEffect.value)
            : TIP_EFFECTS;
        const effect = randomItem(pool)!;
        lastEffect.value = effect;
        caught.value += 1;
        if (effect === 'windfall') {
          const bank = Decimal.mul(cash.value, WINDFALL_BANK);
          const minutes = Decimal.mul(automation.income.value, WINDFALL_INCOME);
          const paid = Decimal.min(bank, minutes);
          addResource(cash, paid);
          ledger.post('a windfall deal', 'tip', { amount: paid.toNumber() });
        } else {
          effects.activate(effect);
          ledger.post(effect === 'bull' ? 'a bull market' : 'a closing spree', 'tip');
        }
        return effect;
      }

      tipsApi.publish(ctx, { current, catchTip, caught, lastEffect, scale, effects, upgrades });
    },
  };
}
