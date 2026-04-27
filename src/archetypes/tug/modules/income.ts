import {
  Decimal,
  addResource,
  createModifierChain,
  createMultiplicativeModifier,
  createResource,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Resource,
} from 'open-loop-engine';
import type { TugData } from '../data/types';
import { type Side, TugTuningRegistryKey } from './tuning';

/**
 * Per-side mineral resource. Player side spends from the unit shop's cost
 * requirement; AI side spends from `createOpponentBotModule(data, 'ai')`.
 */
export const IncomeKey: Record<Side, InjectionKey<Resource<DecimalSource>>> = {
  player: Symbol('tug/match/player/income') as InjectionKey<Resource<DecimalSource>>,
  ai: Symbol('tug/match/ai/income') as InjectionKey<Resource<DecimalSource>>,
};

/**
 * Per-side income-rate modifier chain. Sibling modules (`income-upgrades`,
 * future buffs/penalties) bind multiplicative modifiers onto this chain
 * instead of folding state into the income tick by hand. The tick reads
 * `chain.apply(baseRate)` each frame; chain registry membership is
 * automatic via `createModifierChain`.
 *
 * AI side's `aiIncomeMultiplier` is itself a bound modifier on this chain
 * — a single composition path, no special-cased branches in the tick
 * callback.
 */
export const IncomeRateChainKey: Record<Side, InjectionKey<ModifierChain>> = {
  player: Symbol('tug/match/player/income-rate-chain') as InjectionKey<ModifierChain>,
  ai: Symbol('tug/match/ai/income-rate-chain') as InjectionKey<ModifierChain>,
};

export function createIncomeSideModule(data: TugData, side: Side): EngineModule {
  return {
    id: `tug/match/${side}/income`,
    dependencies: ['tug/tuning'],
    install(ctx) {
      const registry = ctx.inject(TugTuningRegistryKey);

      const income = createResource<DecimalSource>(0, {
        id: data.theme.resourceName.singular,
        displayName: data.theme.resourceName.plural,
        precision: 0,
      });

      // Both sides register `balance/baseIncomeRate` against the shared
      // registry — `tunable()` is built on `setDefault`, which no-ops on the
      // second call, so the first install wins and both sides read the same
      // (scope-perturbable) value. The chain composes the rest: AI side
      // binds `aiIncomeMultiplier` as a multiplicative modifier; income-
      // upgrades binds per-tier multipliers per-side. Tick reads
      // `chain.apply(baseRate.value) * dt` for the per-tick accrual.
      const baseRate = tunable<DecimalSource>(
        registry,
        'balance/baseIncomeRate',
        () => data.balance.baseIncomeRate,
      );

      const incomeRateChain = createModifierChain(`tug/match/${side}/income-rate`);

      if (side === 'ai') {
        const aiMult = tunable<DecimalSource>(
          registry,
          'balance/aiIncomeMultiplier',
          () => data.balance.aiIncomeMultiplier,
        );
        incomeRateChain.bind({
          modifier: createMultiplicativeModifier({
            multiplier: aiMult,
            description: 'AI income multiplier',
          }),
        });
      }

      ctx.onTick((dt) => {
        const rate = incomeRateChain.apply(baseRate.value);
        addResource(income, Decimal.mul(rate, dt));
      });

      ctx.provide(IncomeKey[side], income);
      ctx.provide(IncomeRateChainKey[side], incomeRateChain);
    },
  };
}
