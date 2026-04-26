import {
  Decimal,
  addResource,
  createResource,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Resource,
} from 'open-loop-engine';
import type { TugData } from '../data/types';
import { type Side, TugTuningRegistryKey } from './tuning';

/**
 * Per-side mineral resource. Player side spends from the unit shop's cost
 * requirement; AI side spends from `createAiOpponentModule` (leaf 4). Both
 * sides accrue at `data.balance.baseIncomeRate * dt`, AI side multiplied
 * additionally by `data.balance.aiIncomeMultiplier` — the primary leaf-6
 * Tier-C bisection axis.
 */
export const IncomeKey: Record<Side, InjectionKey<Resource<DecimalSource>>> = {
  player: Symbol('tug/match/player/income') as InjectionKey<Resource<DecimalSource>>,
  ai: Symbol('tug/match/ai/income') as InjectionKey<Resource<DecimalSource>>,
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
      // (scope-perturbable) value. Only the AI side registers
      // `balance/aiIncomeMultiplier`; the player side has no AI multiplier.
      //
      // No `chain.bind` here — Ambient's `tier1BaseRate` idiom binds onto a
      // pre-existing `producer.rateChain`. Tug's income has no producer
      // category to bind against; reading both tunables directly inside the
      // tick callback covers the same `pushScope` perturbation surface.
      const baseRate = tunable<DecimalSource>(
        registry,
        'balance/baseIncomeRate',
        () => data.balance.baseIncomeRate,
      );
      const aiMult =
        side === 'ai'
          ? tunable<DecimalSource>(
              registry,
              'balance/aiIncomeMultiplier',
              () => data.balance.aiIncomeMultiplier,
            )
          : null;

      ctx.onTick((dt) => {
        const base: DecimalSource = baseRate.value;
        const mult: DecimalSource = aiMult ? aiMult.value : 1;
        addResource(income, Decimal.mul(Decimal.mul(base, mult), dt));
      });

      ctx.provide(IncomeKey[side], income);
    },
  };
}
