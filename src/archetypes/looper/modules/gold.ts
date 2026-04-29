import {
  Decimal,
  createResource,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Resource,
} from 'open-loop-engine';
import type { LooperData } from '../data/types';

/**
 * Gold currency — secondary per-loop resource. Vanilla idle-loops shape:
 * resets to 0 on every `onRestart` (handled by `loop.ts`'s `thingsToReset`),
 * extends mid-loop via regular-action `add-gold` rewardEffects, drains via
 * basic-action `spend-gold` completionEffects.
 *
 * Distinct from mana: mana resets to `initialMana` (positive baseline);
 * gold resets to 0. Both are per-loop — neither compounds across loops.
 * Cross-loop persistence flows through capabilities (Talent), progressVars,
 * regularVar `total` (derived), and action `timesCompleted`.
 *
 * `spendGold('all')` returns the actual amount spent so dispatchers can thread
 * it forward — informational only in the canonical demo, since the `Trade`
 * exchange snapshots pre-batch gold inside the completion-effects batch
 * before any spend-gold runs (`actions.ts::applyCompletionEffects`).
 */

export interface LooperGoldModule {
  /** Add to gold. Used by regular-action `add-gold` rewardEffects. */
  addGold(amount: DecimalSource): void;
  /**
   * Subtract from gold, clamped at 0. `'all'` zeroes the balance and returns
   * the prior value. Returns the actual amount spent.
   */
  spendGold(amount: DecimalSource | 'all'): DecimalSource;
  /** Reset gold to 0. Called from `loop.ts` on `onRestart`. */
  resetGold(): void;
}

export const GoldKey: InjectionKey<Resource<DecimalSource>> = Symbol('looper/gold') as InjectionKey<
  Resource<DecimalSource>
>;

export const GoldModuleKey: InjectionKey<LooperGoldModule> = Symbol(
  'looper/gold-module',
) as InjectionKey<LooperGoldModule>;

export function createGoldModule(_data: LooperData): EngineModule {
  return {
    id: 'looper/gold',
    install(ctx) {
      const gold = createResource<DecimalSource>(0, {
        displayName: 'Gold',
        precision: 0,
        id: 'gold',
      });

      const moduleApi: LooperGoldModule = {
        addGold(amount) {
          gold.value = Decimal.add(gold.value, amount);
        },
        spendGold(amount) {
          if (amount === 'all') {
            const prior = gold.value;
            gold.value = 0;
            return prior;
          }
          const requested = new Decimal(amount);
          const actual = Decimal.min(requested, gold.value);
          gold.value = Decimal.sub(gold.value, actual);
          return actual;
        },
        resetGold() {
          gold.value = 0;
        },
      };

      ctx.provide(GoldKey, gold);
      ctx.provide(GoldModuleKey, moduleApi);
    },
  };
}
