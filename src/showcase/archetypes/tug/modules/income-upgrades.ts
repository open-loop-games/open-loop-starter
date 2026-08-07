import { computed, type ComputedRef } from 'vue';
import {
  createBooleanRequirement,
  createCostRequirement,
  createPurchasableCategory,
  Decimal,
  resolveComputable,
  tunable,
  type DecimalSource,
  type EngineModule,
  type Grant,
  type InjectionKey,
  type PurchasableCategory,
  type Requirement,
} from '@open-loop/engine';
import type { IncomeUpgradeDef, TugData } from '../data/types';
import { getIncome, getIncomeRateChain } from './income';
import { type Side, TugTuningRegistryKey } from './tuning';

const incomeUpgradesBySide = {} as Record<Side, PurchasableCategory<IncomeUpgradeDef>>;

export function getIncomeUpgrades(side: Side): PurchasableCategory<IncomeUpgradeDef> {
  return incomeUpgradesBySide[side];
}

/**
 * Per-tier engine-side ROI metrics. Reactive against live cost (post-
 * tunable), live multiplier (post-tunable), and the side's
 * `incomeRateChain.apply(baseRate)` (which reflects already-bought prior
 * tiers via the chain's grant binds).
 *
 * Lives at module scope rather than on a composable because the per-def
 * tunable multiplier and the `baseRate` tunable are install-private —
 * pulling them into a Vue layer would re-plumb privates. Mirrors the
 * shape of producer's `purchaseBeatSeconds`
 * (`open-loop-engine/src/systems/producer-category.ts` `purchaseBeatSeconds`); the
 * cost / Δrate payback term is also exposed engine-side via
 * `selectionHybridPayback` (`open-loop-engine/src/core/policy.ts` `selectionHybridPayback`)
 * for autobuyer-policy consumers.
 */
export interface RoiMetrics {
  /** Pure payback: time after purchase for the extra income to recoup
   *  the cost. Mirrors producer "Pays off in X" vocabulary. `Infinity`
   *  when current rate ≤ 0 or multiplier ≤ 1. */
  paybackSeconds: ComputedRef<number>;
  /** Eco-vs-rush crossover: total elapsed time (including save-up)
   *  until the eco-then-rush strategy reaches the same cumulative
   *  spendable as pure-rush. Equals `paybackSeconds × multiplier`.
   *  The strategically meaningful break-even — answers the
   *  "macro vs rush" framing. `Infinity` in the same edge cases. */
  crossoverSeconds: ComputedRef<number>;
}

export const IncomeUpgradeRoiKey: Record<Side, InjectionKey<Map<string, RoiMetrics>>> = {
  player: Symbol('tug/match/player/income-upgrade-roi') as InjectionKey<Map<string, RoiMetrics>>,
  ai: Symbol('tug/match/ai/income-upgrade-roi') as InjectionKey<Map<string, RoiMetrics>>,
};

/**
 * Per-side income-upgrade shop. Each tier binds a multiplicative modifier
 * onto the side's `incomeRateChain` (set up by `income.ts`) — the engine's
 * purchasable category wires the bind around `bought.value`, so a tier's
 * contribution is automatically applied / removed when bought / reset.
 *
 * Tier gating is sequential: tier N requires tier N-1 bought, mirroring
 * Direct Strike / Age of War. The implementation reads the prior tier's
 * `bought.value` lazily inside the boolean requirement closure — at
 * requirement-eval time, all tiers have registered. No `shopRef`
 * gymnastics needed; the closure captures the `incomeUpgrades` binding,
 * which is set by the time the closure runs.
 *
 * Per-tier `cost` and `multiplier` register as `tunable()` against the
 * registry so balance probes can perturb them via `pushScope`.
 */
export function createIncomeUpgradesSideModule(data: TugData, side: Side): EngineModule {
  return {
    id: `tug/match/${side}/income-upgrades`,
    dependencies: ['tug/tuning', `tug/match/${side}/income`],
    install(ctx) {
      const registry = ctx.inject(TugTuningRegistryKey);
      const income = getIncome(side);
      const incomeRateChain = getIncomeRateChain(side);
      // Re-register the income module's baseRate tunable here so the ROI
      // computed-refs can read it without re-plumbing income module privates.
      // `tunable()` uses `setDefault`, so this returns the value the income
      // module already registered rather than overwriting it.
      const baseRate = tunable<DecimalSource>(registry, 'balance/baseIncomeRate', () => 8);

      const roiMap = new Map<string, RoiMetrics>();

      const incomeUpgrades = createPurchasableCategory<IncomeUpgradeDef>({
        id: `tug/match/${side}/income-upgrades`,
        mapPurchasable: (def) => {
          const idx = data.incomeUpgrades.findIndex((u) => u.id === def.id);
          const priorId = idx > 0 ? data.incomeUpgrades[idx - 1].id : null;
          const priorName = idx > 0 ? data.incomeUpgrades[idx - 1].name : null;

          const cost = tunable(registry, `income-upgrades/${def.id}/cost`, () => def.cost);
          const multiplier = tunable(
            registry,
            `income-upgrades/${def.id}/multiplier`,
            () => def.multiplier,
          );

          // Extra income per second the upgrade would add at current rate:
          // `currentRate × (multiplier − 1)`. `currentRate` evaluates the
          // chain *now*, so already-bought prior tiers are folded in.
          // Returns 0 in degenerate cases so payback surfaces as Infinity
          // below.
          const extraRatePerSec = computed<Decimal>(() => {
            const base = Decimal.fromValue(resolveComputable(baseRate));
            const currentRate = Decimal.fromValue(incomeRateChain.apply(base));
            const m = Decimal.fromValue(resolveComputable(multiplier));
            const minusOne = m.sub(1);
            if (currentRate.lte(0) || minusOne.lte(0)) return Decimal.dZero;
            return currentRate.mul(minusOne);
          });
          const paybackSeconds = computed<number>(() => {
            const extra = extraRatePerSec.value;
            if (extra.lte(0)) return Infinity;
            const c = Decimal.fromValue(resolveComputable(cost));
            return c.div(extra).toNumber();
          });
          const crossoverSeconds = computed<number>(() => {
            const payback = paybackSeconds.value;
            if (!Number.isFinite(payback)) return Infinity;
            const m = Decimal.fromValue(resolveComputable(multiplier)).toNumber();
            return payback * m;
          });
          roiMap.set(def.id, { paybackSeconds, crossoverSeconds });

          const requirements: Requirement[] = [createCostRequirement({ resource: income, cost })];
          if (priorId != null) {
            requirements.push(
              createBooleanRequirement({
                requirement: () => {
                  const prior = incomeUpgrades.getPurchasable(priorId);
                  return prior != null && prior.active.value;
                },
                description: `Requires ${priorName}`,
              }),
            );
          }

          const grants: Grant[] = [
            { chain: incomeRateChain, mult: multiplier, description: def.name },
          ];

          return {
            display: { title: def.name, description: `×${def.multiplier} income` },
            requirements,
            limit: 1,
            grants,
          };
        },
      });
      incomeUpgrades.register(data.incomeUpgrades);

      incomeUpgradesBySide[side] = incomeUpgrades;
      ctx.provide(IncomeUpgradeRoiKey[side], roiMap);
    },
  };
}
