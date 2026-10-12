import {
  Decimal,
  createCostRequirement,
  createBooleanRequirement,
  createPurchasableCategory,
  tunable,
  unref,
  type EngineModule,
  type InjectionKey,
  type Purchasable,
  type PurchasableCategory,
  type ComputedRef,
} from '@open-loop/engine';
import { computed } from 'vue';
import { PRESTIGE_BALANCE } from '../data/prestige';
import { CyclerTuningRegistryKey, type CyclerTunableKey } from './tuning';
import { UPGRADE_BALANCE, CYCLER_UPGRADES, type UpgradeDef } from '../data/upgrades';
import { getBuild } from './build';
import { getPrestige } from './prestige';

/**
 * Upgrades module — the permanent catalog on the prestige currency (see
 * `../IDENTITY.md` § Growth ports, `addUpgrade`). A `createPurchasableCategory`
 * of permanents that cost Fragments:
 *
 *   • reach — freely offered permanent power (raises D_max). Under the peg this
 *     re-baselines W₀, so it adds REACH at +0 run length. Effect delegates to the
 *     build module (`raisePower`), which OWNS the power level L (build is
 *     self-bootable without this module); the catalog only drives it and sets its cost.
 *   • g-bender — the sole PACE lever, reach-locked. Leveled: each level lowers the
 *     operative g toward the g=1 asymptote (`bendBase`), lengthening every run.
 *     Cost + threshold + bend all read the purchasable's OWN `amount` (the bend level)
 *     via a late-bound ref, so there's a single source of truth and no dual-persist.
 *
 * Installs LAST: it reads the Fragments Resource from prestige and the power level
 * from build, and its `bendBase` is read by the cycle kernel's frozen schedule
 * getter (composed over the burn-tier schedule in `modules/index.ts`).
 */
export interface UpgradesApi {
  /** The upgrade catalog. */
  category: PurchasableCategory<UpgradeDef>;
  /** The freely offered reach permanent (raises build power level L). */
  reach: Purchasable;
  /** The reach-locked g-bender (the sole pace lever). */
  gBender: Purchasable;
  /** Current g-bend level L_bend (the g-bender purchasable's amount). */
  gBendLevel: ComputedRef<number>;
  /** Lower an escalation base g toward the g=1 asymptote by the current bend level. */
  bendBase(g: number): number;
}

export const UpgradesKey: InjectionKey<UpgradesApi> = Symbol(
  'cycler/upgrades',
) as InjectionKey<UpgradesApi>;

let upgrades: UpgradesApi | null = null;

export function getUpgrades(): UpgradesApi {
  if (!upgrades) throw new Error('cycler/upgrades: not installed yet');
  return upgrades;
}

export function createUpgradesModule(): EngineModule {
  // The reach threshold's step is structural — it indexes the power ladder rather
  // than setting a cost, so it stays plain.
  const { gBendThresholdStep } = UPGRADE_BALANCE;

  return {
    id: 'cycler/upgrades',
    dependencies: ['cycler/tuning'],
    install(ctx) {
      const registry = ctx.inject(CyclerTuningRegistryKey);
      const t = (key: CyclerTunableKey, fallback: number) => tunable(registry, key, () => fallback);

      // Costs and the bend are read at purchase / run-start, so a scoped override
      // reaches them without a rebuild.
      const quorumT = t('prestige/mergeQuorum', PRESTIGE_BALANCE.mergeQuorum);
      const ratioT = t('upgrades/powerUpgradeCostRatio', UPGRADE_BALANCE.powerUpgradeCostRatio);
      const gBendRatioT = t('upgrades/gBendRatio', UPGRADE_BALANCE.gBendRatio);
      const gBendBaseCostT = t('upgrades/gBendBaseCost', UPGRADE_BALANCE.gBendBaseCost);
      const gBendCostRatioT = t('upgrades/gBendCostRatio', UPGRADE_BALANCE.gBendCostRatio);
      const quorum = () => Number(unref(quorumT));
      const ratio = () => Number(unref(ratioT));
      const gBendRatio = () => Number(unref(gBendRatioT));
      const gBendBaseCost = () => Number(unref(gBendBaseCostT));
      const gBendCostRatio = () => Number(unref(gBendCostRatioT));
      // Late-bound holder for the g-bender purchasable — its `amount` is the bend
      // level L_bend, the single source of truth read by the cost, the reach threshold,
      // and `bendBase`. Populated after `register`; every getter that reads it is
      // lazy (affordability checks / run-start), so it's always set by call time.
      const holder: { gBender?: Purchasable } = {};
      const gBendLevelOf = (): number => Number(holder.gBender?.count.value ?? 0);

      const category = createPurchasableCategory<UpgradeDef>({
        id: 'cycler/upgrades',
        mapPurchasable: (def) => {
          if (def.kind === 'reach') {
            // Cost = mergeQuorum · ratio^L, keyed off the LIVE power level L (build
            // owns it). `onPurchase` raises L; the purchasable's own `count` tracks
            // the purchase count (== L, since only this raises power now). Single-step
            // (`purchaseMaxByDefault: false`) so the live-L cost is never computed wrong by a
            // purchase-max walk.
            return {
              display: { title: def.title, description: def.description },
              requirements: createCostRequirement({
                resource: getPrestige().fragmentsResource,
                cost: () =>
                  new Decimal(quorum()).mul(Decimal.pow(ratio(), getBuild().powerLevel.value)),
              }),
              limit: Infinity,
              purchaseMaxByDefault: false,
              onPurchase: () => {
                getBuild().raisePower();
              },
            };
          }
          if (def.kind === 'g-bender') {
            // The sole pace lever. Two requirements (flat array — not allOf — so
            // the cost stays bulk-aware; purchaseMaxByDefault is off anyway):
            //   • cost — geometric in the bend level: base · ratio^L_bend.
            //   • reach threshold — the NEXT level (L_bend+1) needs L ≥ (L_bend+1)·step.
            // The bend itself is applied through the frozen schedule getter
            // (`modules/index.ts` → `bendBase`), so it lands on the next run.
            return {
              display: { title: def.title, description: def.description },
              requirements: [
                createCostRequirement({
                  resource: getPrestige().fragmentsResource,
                  cost: () =>
                    new Decimal(gBendBaseCost()).mul(Decimal.pow(gBendCostRatio(), gBendLevelOf())),
                }),
                createBooleanRequirement({
                  met: () =>
                    getBuild().powerLevel.value >= (gBendLevelOf() + 1) * gBendThresholdStep,
                  description: 'reach threshold',
                }),
              ],
              limit: Infinity,
              purchaseMaxByDefault: false,
            };
          }
          throw new Error(`cycler/upgrades: unhandled upgrade kind '${(def as UpgradeDef).kind}'`);
        },
      });
      category.register(CYCLER_UPGRADES);

      const reach = category.getPurchasable('reach');
      holder.gBender = category.getPurchasable('g-bender');
      if (!reach || !holder.gBender) throw new Error('cycler/upgrades: catalog failed to register');
      const gBender = holder.gBender;

      const gBendLevel = computed(() => gBendLevelOf());
      // g_eff = 1 + (g − 1)·r_bend^L_bend — the multiplicative approach to the g=1
      // asymptote (data/upgrades.ts § Balance (g-bender)). L_bend 0 ⇒ g unchanged.
      const bendBase = (g: number): number => 1 + (g - 1) * Math.pow(gBendRatio(), gBendLevelOf());

      const api: UpgradesApi = { category, reach, gBender, gBendLevel, bendBase };
      upgrades = api;
      ctx.provide(UpgradesKey, api);
    },
  };
}
