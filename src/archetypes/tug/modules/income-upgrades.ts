import {
  createBooleanRequirement,
  createCostRequirement,
  createPurchasableCategory,
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

      const incomeUpgrades = createPurchasableCategory<IncomeUpgradeDef>({
        id: `tug/match/${side}/income-upgrades`,
        mapPurchasable: (def) => {
          const idx = data.incomeUpgrades.findIndex((u) => u.id === def.id);
          const priorId = idx > 0 ? data.incomeUpgrades[idx - 1].id : null;
          const priorName = idx > 0 ? data.incomeUpgrades[idx - 1].name : null;

          const cost = wrapCost(registry, def);
          const multiplier = wrapMultiplier(registry, def);

          const requirements: Requirement[] = [createCostRequirement({ resource: income, cost })];
          if (priorId != null) {
            requirements.push(
              createBooleanRequirement({
                requirement: () => {
                  const prior = incomeUpgrades.getPurchasable(priorId);
                  return prior != null && prior.bought.value;
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
