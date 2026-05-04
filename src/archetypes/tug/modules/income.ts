import {
  Decimal,
  addResource,
  createModifierChain,
  createMultiplicativeModifier,
  createResource,
  tunable,
  type DecimalSource,
  type EngineModule,
  type ModifierChain,
  type Resource,
} from 'open-loop-engine';
import type { TugData } from '../data/types';
import { type Side, TugTuningRegistryKey } from './tuning';

// Module-scope per-side handles set during install. Sibling modules +
// composables + UI import the typed accessors below; engine self-publishes
// these via ResourceRegistryKey + ChainRegistryKey for cross-archetype /
// external consumers (sim harness, devtools).
const incomeBySide = {} as Record<Side, Resource<DecimalSource>>;
const incomeRateChainBySide = {} as Record<Side, ModifierChain>;

export function getIncome(side: Side): Resource<DecimalSource> {
  return incomeBySide[side];
}

export function getIncomeRateChain(side: Side): ModifierChain {
  return incomeRateChainBySide[side];
}

export function createIncomeSideModule(data: TugData, side: Side): EngineModule {
  return {
    id: `tug/match/${side}/income`,
    dependencies: ['tug/tuning'],
    install(ctx) {
      const registry = ctx.inject(TugTuningRegistryKey);

      const income = createResource<DecimalSource>(0, {
        id: `tug/match/${side}/income`,
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

      incomeBySide[side] = income;
      incomeRateChainBySide[side] = incomeRateChain;
    },
  };
}
