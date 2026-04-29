import { computed, type ComputedRef } from 'vue';
import {
  createBooleanRequirement,
  createCostRequirement,
  createPurchasableCategory,
  Decimal,
  resolveComputable,
  tunable,
  type Computable,
  type DecimalSource,
  type EngineModule,
  type Grant,
  type InjectionKey,
  type OverrideRegistry,
  type PurchasableCategory,
  type Requirement,
} from 'open-loop-engine';
import type { IncomeUpgradeDef, TugData } from '../data/types';
import { IncomeKey, IncomeRateChainKey } from './income';
import { type Side, type TugTunables, TugTuningRegistryKey } from './tuning';

export const IncomeUpgradesKey: Record<
  Side,
  InjectionKey<PurchasableCategory<IncomeUpgradeDef>>
> = {
  player: Symbol('tug/match/player/income-upgrades') as InjectionKey<
    PurchasableCategory<IncomeUpgradeDef>
  >,
  ai: Symbol('tug/match/ai/income-upgrades') as InjectionKey<PurchasableCategory<IncomeUpgradeDef>>,
};

/**
 * Per-tier engine-side ROI metrics. Reactive against live cost (post-
 * tunable), live multiplier (post-tunable), and the side's
 * `incomeRateChain.apply(baseRate)` (which reflects already-bought prior
 * tiers via the chain's grant binds, plus AI-side scalars like
 * `aiIncomeMultiplier`).
 *
 * Lives at module scope rather than on a composable because
 * {@link wrapMultiplier} and the `baseRate` tunable are install-private —
 * pulling them into a Vue layer would re-plumb privates. Mirrors the
 * shape of producer's `purchaseBeatSeconds`
 * (`open-loop-engine/src/systems/producer-category.ts:347`).
 *
 * TODO(expansion): a generic engine-side `purchasablePaybackSeconds`
 * helper for one-shot multiplicative-rate-multiplier upgrades. Tug is
 * N=1; ambient unlocks/upgrades is the obvious second consumer. See
 * `open-loop-engine/docs/candidate-primitives.md`.
 */
export interface RoiMetrics {
  /** Pure payback: time after purchase for the extra income to recoup
   *  the cost. Mirrors producer "Pays off in X" vocabulary. `Infinity`
   *  when current rate ≤ 0 or multiplier ≤ 1. */
  paybackSeconds: ComputedRef<number>;
  /** Eco-vs-rush crossover: total elapsed time (including save-up)
   *  until the eco-then-rush strategy reaches the same cumulative
   *  spendable as pure-rush. Equals `paybackSeconds × multiplier`.
   *  The strategically meaningful break-even — answers OL-733's
   *  "macro vs rush" framing. `Infinity` in the same edge cases. */
  crossoverSeconds: ComputedRef<number>;
}

export const IncomeUpgradeRoiKey: Record<Side, InjectionKey<Map<string, RoiMetrics>>> = {
  player: Symbol('tug/match/player/income-upgrade-roi') as InjectionKey<Map<string, RoiMetrics>>,
  ai: Symbol('tug/match/ai/income-upgrade-roi') as InjectionKey<Map<string, RoiMetrics>>,
};

// Income-upgrade ids whose `cost` / `multiplier` are registered with the
// tuning registry. Mirrors `units.ts::TUNABLE_COST_IDS` — opt-in keeps the
// leaf-6 bisection surface narrow and greppable. Add tier ids here AND
// extend `TugTunableKey` in tuning.ts when graduating new bisection axes.
const TUNABLE_COST_IDS = new Set<string>(['refinery-1']);
const TUNABLE_MULTIPLIER_IDS = new Set<string>(['refinery-1']);

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
 */
export function createIncomeUpgradesSideModule(data: TugData, side: Side): EngineModule {
  return {
    id: `tug/match/${side}/income-upgrades`,
    dependencies: ['tug/tuning', `tug/match/${side}/income`],
    install(ctx) {
      const registry = ctx.inject(TugTuningRegistryKey);
      const income = ctx.inject(IncomeKey[side]);
      const incomeRateChain = ctx.inject(IncomeRateChainKey[side]);
      // Same key as `income.ts:62` — `tunable()` uses `setDefault`, so this
      // second call returns whatever the income module already registered
      // rather than overwriting it. We need it here to compute live ROI
      // metrics without re-plumbing module privates.
      const baseRate = tunable<DecimalSource>(
        registry,
        'balance/baseIncomeRate',
        () => data.balance.baseIncomeRate,
      );

      const roiMap = new Map<string, RoiMetrics>();

      const incomeUpgrades = createPurchasableCategory<IncomeUpgradeDef>({
        id: `tug/match/${side}/income-upgrades`,
        mapPurchasable: (def) => {
          const idx = data.incomeUpgrades.findIndex((u) => u.id === def.id);
          const priorId = idx > 0 ? data.incomeUpgrades[idx - 1].id : null;
          const priorName = idx > 0 ? data.incomeUpgrades[idx - 1].name : null;

          const cost = wrapCost(registry, def);
          const multiplier = wrapMultiplier(registry, def);

          // Extra income per second the upgrade would add at current rate:
          // `currentRate × (multiplier − 1)`. `currentRate` evaluates the
          // chain *now*, so already-bought prior tiers (and AI scalars) are
          // already folded in. Returns 0 in degenerate cases so payback
          // surfaces as Infinity below.
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

      ctx.provide(IncomeUpgradesKey[side], incomeUpgrades);
      ctx.provide(IncomeUpgradeRoiKey[side], roiMap);
    },
  };
}

/**
 * Wrap a tier's static cost behind a tunable key for representative ids.
 * Default closure reads `def.cost`, so unscoped runs match the data layer;
 * leaf 6's tuner pushes scopes against `income-upgrades/<id>/cost` to
 * bisect against beat fire-time bands. Both sides share the same registry,
 * so a single scope-push affects both — symmetric perturbation matches
 * the leaf-6 win-rate probe shape.
 */
function wrapCost(
  registry: OverrideRegistry<TugTunables>,
  def: IncomeUpgradeDef,
): Computable<DecimalSource> {
  if (!TUNABLE_COST_IDS.has(def.id)) return def.cost;
  const key = `income-upgrades/${def.id}/cost`;
  return tunable<DecimalSource>(registry, key, () => def.cost);
}

/**
 * Wrap a tier's multiplier behind a tunable key for representative ids.
 * Same reasoning as `wrapCost` — opt-in tunability for the bisection
 * axes leaf 6 actually needs.
 */
function wrapMultiplier(
  registry: OverrideRegistry<TugTunables>,
  def: IncomeUpgradeDef,
): Computable<DecimalSource> {
  if (!TUNABLE_MULTIPLIER_IDS.has(def.id)) return def.multiplier;
  const key = `income-upgrades/${def.id}/multiplier`;
  return tunable<DecimalSource>(registry, key, () => def.multiplier);
}
